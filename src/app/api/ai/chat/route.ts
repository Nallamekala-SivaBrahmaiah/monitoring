import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Conversation from '@/models/Conversation';



interface MessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `You are a helpful, intelligent, versatile, and articulate AI assistant, similar to ChatGPT.
You excel at:
- Answering general knowledge, science, philosophy, and history questions.
- Writing, debugging, explaining, and refactoring code across all languages (TypeScript, Python, Go, Rust, Java, C++, SQL, Bash, etc.).
- DevOps, cloud architectures, Linux administration, Docker, Kubernetes, CI/CD, and networking.
- System troubleshooting, performance optimization, and best practices.
- Drafting documents, articles, emails, summaries, and creative writing.
- Breaking down complex topics into clear, intuitive step-by-step instructions.

Guidelines:
1. Provide accurate, insightful, and well-structured answers.
2. Use markdown formatting effectively: headers (###), bullet points, bold text, and numbered lists.
3. For code or commands, always use fenced code blocks with the language identifier (e.g., \`\`\`python, \`\`\`bash, \`\`\`typescript).
4. Maintain context across multiple conversation turns to naturally answer follow-up questions.
5. Be concise and direct, while remaining comprehensive and friendly.`;

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    const { messages, conversationId, stream = true } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'A valid messages array is required.' }, { status: 400 });
    }

    const latestUserMessage = messages[messages.length - 1];
    if (!latestUserMessage || !latestUserMessage.content) {
      return NextResponse.json({ error: 'User message content is required.' }, { status: 400 });
    }

    // 1. Identify or create conversation in MongoDB
    let currentConversation: any = null;
    if (conversationId) {
      currentConversation = await Conversation.findById(conversationId);
    }

    if (!currentConversation) {
      // Auto-generate title from the first 40 chars of the user prompt
      const generatedTitle = latestUserMessage.content.slice(0, 42).replace(/[\r\n]+/g, ' ').trim() || 'New Chat';
      currentConversation = await Conversation.create({
        title: generatedTitle,
        messages: [],
      });
    }

    // Append user message to database
    currentConversation.messages.push({
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: latestUserMessage.content,
      timestamp: new Date(),
    });
    await currentConversation.save();

    // 2. Determine AI Provider (OpenAI or Gemini)
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Check if at least one API key is present
    if (!openaiKey && !geminiKey) {
      const fallbackNotice = `### ⚠️ AI Provider API Key Required

To enable real-time, live AI responses with ChatGPT or Gemini, please configure an API key in your environment variables:

1. Open your \`.env.local\` file in the project root:
\`\`\`bash
# Option A: OpenAI (ChatGPT gpt-4o / gpt-4o-mini)
OPENAI_API_KEY=sk-proj-your-openai-api-key

# Option B: Google Gemini (Gemini 1.5 Flash / Pro)
GEMINI_API_KEY=AIzaSy-your-gemini-api-key
\`\`\`
2. Restart the application server.

---

#### 💡 Demonstration Answer to Your Question:
*"${latestUserMessage.content}"*

Here is general guidance:
- You asked: **${latestUserMessage.content.slice(0, 100)}**
- As an AI chatbot, once your API key is added above, I will stream full generative answers token-by-token directly from OpenAI or Google Gemini.`;

      // Save assistant response
      currentConversation.messages.push({
        id: `msg-assistant-${Date.now()}`,
        role: 'assistant',
        content: fallbackNotice,
        timestamp: new Date(),
      });
      await currentConversation.save();

      return NextResponse.json({
        conversationId: currentConversation._id.toString(),
        title: currentConversation.title,
        message: {
          id: `msg-assistant-${Date.now()}`,
          role: 'assistant',
          content: fallbackNotice,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 3. Prepare message payload for LLM
    const formattedMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-12).map((m: MessagePayload) => ({
        role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
        content: m.content,
      })),
    ];

    // 4. Handle OpenAI Streaming
    if (openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: formattedMessages,
            temperature: 0.7,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI API error (${response.status}): ${errText}`);
        }

        if (!response.body) {
          throw new Error('No readable stream returned by OpenAI API.');
        }

        // Return streaming response with SSE headers
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let fullAssistantContent = '';

        const customStream = new ReadableStream({
          async start(controller) {
            // First emit conversation metadata
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ conversationId: currentConversation._id.toString(), title: currentConversation.title })}\n\n`)
            );

            const reader = response.body!.getReader();
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith('data:')) continue;
                  if (trimmed === 'data: [DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    continue;
                  }

                  try {
                    const json = JSON.parse(trimmed.slice(5).trim());
                    const token = json.choices?.[0]?.delta?.content || '';
                    if (token) {
                      fullAssistantContent += token;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }
                  } catch {
                    // skip non-json chunk
                  }
                }
              }
            } catch (err: any) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
            } finally {
              // Persist assistant message in MongoDB
              if (fullAssistantContent) {
                try {
                  await Conversation.findByIdAndUpdate(currentConversation._id, {
                    $push: {
                      messages: {
                        id: `msg-ast-${Date.now()}`,
                        role: 'assistant',
                        content: fullAssistantContent,
                        timestamp: new Date(),
                      },
                    },
                  });
                } catch (saveErr) {
                  console.error('Failed to save assistant response:', saveErr);
                }
              }
              controller.close();
            }
          },
        });

        return new Response(customStream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        });
      } catch (openAiErr: any) {
        console.error('OpenAI stream error, checking Gemini fallback:', openAiErr);
        if (!geminiKey) {
          return NextResponse.json({ error: openAiErr.message || 'OpenAI service error' }, { status: 502 });
        }
      }
    }

    // 5. Handle Google Gemini Streaming
    if (geminiKey) {
      try {
        const contents = messages.slice(-10).map((m: MessagePayload) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${geminiKey}`;

        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API error (${response.status}): ${errText}`);
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let fullAssistantContent = '';

        const customStream = new ReadableStream({
          async start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ conversationId: currentConversation._id.toString(), title: currentConversation.title })}\n\n`)
            );

            const reader = response.body!.getReader();
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith('data:')) continue;

                  try {
                    const json = JSON.parse(trimmed.slice(5).trim());
                    const token = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (token) {
                      fullAssistantContent += token;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }
                  } catch {
                    // skip non-json chunk
                  }
                }
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } catch (err: any) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
            } finally {
              if (fullAssistantContent) {
                try {
                  await Conversation.findByIdAndUpdate(currentConversation._id, {
                    $push: {
                      messages: {
                        id: `msg-ast-${Date.now()}`,
                        role: 'assistant',
                        content: fullAssistantContent,
                        timestamp: new Date(),
                      },
                    },
                  });
                } catch (saveErr) {
                  console.error('Failed to save assistant response:', saveErr);
                }
              }
              controller.close();
            }
          },
        });

        return new Response(customStream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        });
      } catch (geminiErr: any) {
        console.error('Gemini error:', geminiErr);
        return NextResponse.json({ error: geminiErr.message || 'Gemini service error' }, { status: 502 });
      }
    }

    return NextResponse.json({ error: 'No AI service available' }, { status: 500 });
  } catch (err: any) {
    console.error('AI chat endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Internal AI server error' }, { status: 500 });
  }
}
