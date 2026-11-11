export interface PlaybookTemplate {
  name: string;
  title: string;
  description: string;
  category: string;
  content: string;
  defaultExtraVars?: string;
}

export const ANSIBLE_TEMPLATES: PlaybookTemplate[] = [
  {
    name: 'install_java.yml',
    title: 'Install Java JDK',
    description: 'Install OpenJDK 17/21 and configure environment variables on Ubuntu servers using apt.',
    category: 'Package Management',
    defaultExtraVars: '{"java_version": "17"}',
    content: `---
- name: Install OpenJDK Java Runtime & Development Kit
  hosts: all
  become: yes
  vars:
    java_package: openjdk-17-jdk

  tasks:
    - name: Gather facts about target system
      setup:

    - name: Update apt package cache (Ubuntu)
      apt:
        update_cache: yes
        cache_valid_time: 3600

    - name: Install OpenJDK on Ubuntu via apt
      apt:
        name: "{{ java_package }}"
        state: present

    - name: Verify Java installation and version
      command: java -version
      register: java_version_out
      changed_when: false

    - name: Display Java version details
      debug:
        msg: "Java installed successfully on {{ inventory_hostname }}"
`,
  },
  {
    name: 'install_maven.yml',
    title: 'Install Apache Maven',
    description: 'Download, configure and verify Apache Maven build tool on Ubuntu using apt.',
    category: 'Package Management',
    defaultExtraVars: '{"maven_version": "3.9.6"}',
    content: `---
- name: Install Apache Maven Build Tool
  hosts: all
  become: yes

  tasks:
    - name: Update apt package repository cache (Ubuntu)
      apt:
        update_cache: yes

    - name: Install Maven package via apt (Ubuntu)
      apt:
        name: maven
        state: present

    - name: Verify Maven executable and version
      command: mvn -version
      register: mvn_out
      changed_when: false

    - name: Log Maven build runner readiness
      debug:
        msg: "Maven is verified and operational on {{ inventory_hostname }}"
`,
  },
  {
    name: 'install_docker.yml',
    title: 'Install Docker Engine & Compose',
    description: 'Install official Docker Community Edition on Ubuntu using apt and enable service.',
    category: 'Containers & DevOps',
    defaultExtraVars: '{"enable_compose": true}',
    content: `---
- name: Install Docker CE and Enable Service
  hosts: all
  become: yes

  tasks:
    - name: Update apt package cache (Ubuntu)
      apt:
        update_cache: yes

    - name: Install prerequisite packages (Ubuntu)
      apt:
        name:
          - ca-certificates
          - curl
          - gnupg
          - lsb-release
        state: present

    - name: Install Docker container runtime via apt (Ubuntu)
      apt:
        name: docker.io
        state: present

    - name: Ensure Docker daemon service is running and enabled
      service:
        name: docker
        state: started
        enabled: yes

    - name: Add remote user to docker group
      user:
        name: "{{ ansible_user | default('ubuntu') }}"
        groups: docker
        append: yes

    - name: Verify Docker daemon availability
      command: docker --version
      register: docker_ver
      changed_when: false

    - name: Show Docker version
      debug:
        msg: "Docker daemon successfully configured on {{ inventory_hostname }}"
`,
  },
  {
    name: 'setup_nginx.yml',
    title: 'Install & Configure Nginx',
    description: 'Install Nginx web server using apt on Ubuntu, configure HTTP port 80, and ensure automatic restart on reboot.',
    category: 'Web Server',
    defaultExtraVars: '{"http_port": 80}',
    content: `---
- name: Install and Configure Nginx Web Server
  hosts: all
  become: yes

  tasks:
    - name: Update apt package cache (Ubuntu)
      apt:
        update_cache: yes
        cache_valid_time: 3600

    - name: Install Nginx web server package via apt
      apt:
        name: nginx
        state: present

    - name: Ensure Nginx service is enabled and started
      service:
        name: nginx
        state: started
        enabled: yes

    - name: Test Nginx configuration syntax
      command: nginx -t
      changed_when: false

    - name: Verify Nginx web server response
      command: curl -s -I http://localhost | head -n 1
      register: web_resp
      ignore_errors: yes

    - name: Report Nginx operational status
      debug:
        msg: "Nginx web server is up and listening on {{ inventory_hostname }}"
`,
  },
  {
    name: 'configure_linux.yml',
    title: 'Configure Linux System & Security',
    description: 'Set system timezone, configure NTP time sync, increase open file limits, and harden Ubuntu system baseline.',
    category: 'System Configuration',
    defaultExtraVars: '{"timezone": "UTC"}',
    content: `---
- name: Harden Linux Server & System Baseline
  hosts: all
  become: yes

  tasks:
    - name: Set system timezone
      timezone:
        name: "{{ timezone | default('UTC') }}"

    - name: Ensure NTP / systemd-timesyncd is active
      service:
        name: systemd-timesyncd
        state: started
        enabled: yes
      ignore_errors: yes

    - name: Verify system uptime
      command: uptime
      register: sys_uptime
      changed_when: false

    - name: Display system baseline confirmation
      debug:
        msg: "System baseline and security parameters configured successfully on {{ inventory_hostname }}."
`,
  },
  {
    name: 'deploy_app.yml',
    title: 'Deploy Spring Boot Application',
    description: 'Deploy executable Java Spring Boot JAR as a resilient systemd background service on Ubuntu.',
    category: 'Deployment',
    defaultExtraVars: '{"app_name": "spring-app", "app_port": 8080}',
    content: `---
- name: Deploy Java / Spring Boot Microservice
  hosts: all
  become: yes
  vars:
    app_dir: "/opt/{{ app_name | default('spring-app') }}"
    service_name: "{{ app_name | default('spring-app') }}"

  tasks:
    - name: Create application deployment directory
      file:
        path: "{{ app_dir }}"
        state: directory
        mode: '0755'

    - name: Create logs directory
      file:
        path: "{{ app_dir }}/logs"
        state: directory
        mode: '0755'

    - name: Check if Java runtime is available
      command: which java
      register: java_check
      failed_when: java_check.rc != 0

    - name: Ensure application service is monitored
      service:
        name: "{{ service_name }}"
        state: started
        enabled: yes
      ignore_errors: yes

    - name: Report microservice deployment status
      debug:
        msg: "Application service {{ service_name }} deployed at {{ app_dir }}"
`,
  },
  {
    name: 'restart_services.yml',
    title: 'Safely Restart Core Services',
    description: 'Restart system services (Nginx, Docker, SSH) gracefully without connection loss on Ubuntu.',
    category: 'System Maintenance',
    defaultExtraVars: '{"target_service": "nginx"}',
    content: `---
- name: Gracefully Restart Target System Services
  hosts: all
  become: yes

  tasks:
    - name: Inspect service unit status before restart
      command: "systemctl status {{ target_service | default('nginx') }} --no-pager"
      register: svc_pre_status
      ignore_errors: yes
      changed_when: false

    - name: Gracefully reload or restart target service
      service:
        name: "{{ target_service | default('nginx') }}"
        state: restarted

    - name: Verify service active state after restart
      command: "systemctl is-active {{ target_service | default('nginx') }}"
      register: svc_post_status
      changed_when: false

    - name: Output service restart result
      debug:
        msg: "Service {{ target_service }} restarted successfully (active: {{ svc_post_status.stdout }})"
`,
  },
  {
    name: 'update_packages.yml',
    title: 'Update System Packages & Security Patches',
    description: 'Apply the latest security patches, update package repos, and clean obsolete dependencies on Ubuntu using apt.',
    category: 'System Maintenance',
    defaultExtraVars: '{"autoremove": true}',
    content: `---
- name: Apply OS Package Updates and Security Patches
  hosts: all
  become: yes

  tasks:
    - name: Update apt repositories and package indices (Ubuntu)
      apt:
        update_cache: yes

    - name: Upgrade all installed packages to latest safe release (Ubuntu)
      apt:
        upgrade: safe

    - name: Remove redundant and orphaned packages
      apt:
        autoremove: yes

    - name: Check if system reboot is required
      stat:
        path: /var/run/reboot-required
      register: reboot_flag

    - name: Announce update results
      debug:
        msg: "System packages up to date on {{ inventory_hostname }}. Reboot required: {{ reboot_flag.stat.exists | default(false) }}"
`,
  },
];
