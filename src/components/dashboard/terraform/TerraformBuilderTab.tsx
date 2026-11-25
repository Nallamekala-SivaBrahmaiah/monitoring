'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Server,
  Cloud,
  CheckCircle2,
  Plus,
  Copy,
  Check,
  Code2,
  HardDrive,
  Cpu,
  Database,
  Shield,
  Zap,
  Globe,
  Network,
  FileCode,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Sliders,
  Terminal,
  Settings,
  FolderGit2,
  Edit3,
  Trash2,
  Save,
  Search,
  RotateCcw,
  AlertTriangle,
  X,
  FileText,
  Key,
} from 'lucide-react';
import { AwsLogo, AzureLogo, TerraformLogo } from '@/components/icons/CloudIcons';
import { ENTERPRISE_TERRAFORM_TEMPLATES } from '@/lib/terraform/templatesData';

export interface InfrastructureResource {
  id: string;
  name: string;
  type: string;
  provider: 'aws' | 'azure';
  category: 'network' | 'compute' | 'storage' | 'security';
  hcl: string;
  params: Record<string, any>;
  updatedAt: string;
}

export interface InfrastructureVariable {
  id: string;
  name: string;
  type: string;
  defaultValue: string;
  description: string;
  sensitive: boolean;
}

export interface InfrastructureOutput {
  id: string;
  name: string;
  value: string;
  description: string;
  sensitive: boolean;
}

interface TerraformBuilderTabProps {
  activeProject: any;
  onAppendCodeToProject: (hclCode: string, resourceName?: string) => Promise<void>;
  onSaveFiles?: (files: Array<{ name: string; content: string }>) => Promise<void>;
  onApplyTemplateToProject?: (template: any) => Promise<void>;
  onSwitchTab: (tab: any) => void;
  onOpenCreateProject?: (templateId?: string) => void;
}

export function TerraformBuilderTab({
  activeProject,
  onAppendCodeToProject,
  onSaveFiles,
  onApplyTemplateToProject,
  onSwitchTab,
  onOpenCreateProject,
}: TerraformBuilderTabProps) {
  const currentProvider: 'aws' | 'azure' = activeProject?.provider || 'aws';

  // Navigation modes inside Builder
  const [viewMode, setViewMode] = useState<'canvas' | 'variables' | 'outputs' | 'templates' | 'builder'>('canvas');

  // ==========================================
  // 1. STACK & RESOURCES MANAGEMENT STATE
  // ==========================================
  const [resources, setResources] = useState<InfrastructureResource[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [cloudFilter, setCloudFilter] = useState<'all' | 'aws' | 'azure'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'network' | 'compute' | 'storage' | 'security'>('all');
  const [copiedResId, setCopiedResId] = useState<string | null>(null);
  const [isSavingStack, setIsSavingStack] = useState(false);
  const [stackSaveSuccess, setStackSaveSuccess] = useState(false);

  // Modals for Resource CRUD:
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModeTab, setCreateModeTab] = useState<'params' | 'raw_hcl'>('params');
  const [newResProvider, setNewResProvider] = useState<'aws' | 'azure'>('aws');
  const [newResCategory, setNewResCategory] = useState<'network' | 'compute' | 'storage' | 'security'>('network');
  const [newResType, setNewResType] = useState<string>('aws_internet_gateway');
  const [newResName, setNewResName] = useState('app_igw');
  const [newResParams, setNewResParams] = useState<Record<string, any>>({
    cidr: '10.0.0.0/16',
    instanceType: 't3.medium',
    ami: 'ami-0c7217cdde317cfec',
    vmSize: 'Standard_B2s',
    diskSize: 40,
    location: 'eastus',
    versioning: true,
  });
  const [customCreateHcl, setCustomCreateHcl] = useState('');
  const [autoAddVariable, setAutoAddVariable] = useState(true);
  const [autoAddOutput, setAutoAddOutput] = useState(true);

  // Edit Resource Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResource, setEditingResource] = useState<InfrastructureResource | null>(null);
  const [editName, setEditName] = useState('');
  const [editHcl, setEditHcl] = useState('');

  // Delete Resource Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<InfrastructureResource | null>(null);

  // ==========================================
  // 2. VARIABLES STATE & CRUD (AWS + AZURE)
  // ==========================================
  const [variablesList, setVariablesList] = useState<InfrastructureVariable[]>([
    {
      id: 'var-1',
      name: 'aws_region',
      type: 'string',
      defaultValue: 'us-east-1',
      description: 'AWS primary deployment region',
      sensitive: false,
    },
    {
      id: 'var-2',
      name: 'aws_instance_type',
      type: 'string',
      defaultValue: 't3.medium',
      description: 'AWS EC2 compute sizing profile',
      sensitive: false,
    },
    {
      id: 'var-3',
      name: 'aws_vpc_cidr',
      type: 'string',
      defaultValue: '10.0.0.0/16',
      description: 'AWS VPC network address block',
      sensitive: false,
    },
    {
      id: 'var-4',
      name: 'azure_location',
      type: 'string',
      defaultValue: 'eastus',
      description: 'Azure target datacenter region',
      sensitive: false,
    },
    {
      id: 'var-5',
      name: 'azure_vm_size',
      type: 'string',
      defaultValue: 'Standard_B2s',
      description: 'Azure Linux VM instance profile',
      sensitive: false,
    },
    {
      id: 'var-6',
      name: 'azure_vnet_cidr',
      type: 'string',
      defaultValue: '10.1.0.0/16',
      description: 'Azure VNet address space',
      sensitive: false,
    },
    {
      id: 'var-7',
      name: 'environment',
      type: 'string',
      defaultValue: activeProject?.environment || 'production',
      description: 'Environment classification tag',
      sensitive: false,
    },
  ]);

  const [showVarModal, setShowVarModal] = useState(false);
  const [varEditingId, setVarEditingId] = useState<string | null>(null);
  const [varName, setVarName] = useState('');
  const [varType, setVarType] = useState('string');
  const [varDefault, setVarDefault] = useState('');
  const [varDesc, setVarDesc] = useState('');
  const [varSensitive, setVarSensitive] = useState(false);

  // ==========================================
  // 3. OUTPUTS STATE & CRUD (AWS + AZURE)
  // ==========================================
  const [outputsList, setOutputsList] = useState<InfrastructureOutput[]>([
    {
      id: 'out-1',
      name: 'ec2_public_ip',
      value: 'aws_instance.web_instance.public_ip',
      description: 'AWS EC2 Public IPv4 endpoint',
      sensitive: false,
    },
    {
      id: 'out-2',
      name: 'internet_gateway_id',
      value: 'aws_internet_gateway.prod_igw.id',
      description: 'AWS Internet Gateway identifier',
      sensitive: false,
    },
    {
      id: 'out-3',
      name: 'vpc_id',
      value: 'aws_vpc.prod_vpc.id',
      description: 'AWS VPC backbone identifier',
      sensitive: false,
    },
    {
      id: 'out-4',
      name: 's3_bucket_arn',
      value: 'aws_s3_bucket.prod_storage.arn',
      description: 'AWS S3 bucket target ARN',
      sensitive: false,
    },
    {
      id: 'out-5',
      name: 'vm_public_ip',
      value: 'azurerm_public_ip.prod_pip.ip_address',
      description: 'Azure Linux VM Public IP endpoint',
      sensitive: false,
    },
    {
      id: 'out-6',
      name: 'vnet_id',
      value: 'azurerm_virtual_network.prod_vnet.id',
      description: 'Azure Virtual Network identifier',
      sensitive: false,
    },
    {
      id: 'out-7',
      name: 'storage_primary_blob_endpoint',
      value: 'azurerm_storage_account.prod_storage.primary_blob_endpoint',
      description: 'Azure Storage Account Primary Blob Endpoint',
      sensitive: false,
    },
  ]);

  const [showOutModal, setShowOutModal] = useState(false);
  const [outEditingId, setOutEditingId] = useState<string | null>(null);
  const [outName, setOutName] = useState('');
  const [outValue, setOutValue] = useState('');
  const [outDesc, setOutDesc] = useState('');
  const [outSensitive, setOutSensitive] = useState(false);

  // Initialize initial stack resources with BOTH AWS (including Internet Gateway) AND Azure!
  useEffect(() => {
    const defaultAwsStack: InfrastructureResource[] = [
      {
        id: 'aws-res-1',
        name: 'prod_vpc',
        type: 'aws_vpc',
        provider: 'aws',
        category: 'network',
        hcl: `# AWS Virtual Private Cloud
resource "aws_vpc" "prod_vpc" {
  cidr_block           = var.aws_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "prod-vpc"
    Environment = var.environment
  }
}`,
        params: { cidr: '10.0.0.0/16' },
        updatedAt: 'Active',
      },
      {
        id: 'aws-res-2',
        name: 'public_subnet',
        type: 'aws_subnet',
        provider: 'aws',
        category: 'network',
        hcl: `# AWS Public Subnet
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.prod_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${'us-east-1a'}"
  map_public_ip_on_launch = true

  tags = {
    Name = "prod-public-subnet"
  }
}`,
        params: { cidr: '10.0.1.0/24', az: 'us-east-1a' },
        updatedAt: 'Active',
      },
      {
        id: 'aws-res-3',
        name: 'prod_igw',
        type: 'aws_internet_gateway',
        provider: 'aws',
        category: 'network',
        hcl: `# AWS Internet Gateway & Public Route
resource "aws_internet_gateway" "prod_igw" {
  vpc_id = aws_vpc.prod_vpc.id

  tags = {
    Name        = "prod-igw"
    Environment = var.environment
  }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.prod_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.prod_igw.id
  }

  tags = {
    Name = "prod-public-rt"
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}`,
        params: { gateway: 'prod_igw', vpc: 'prod_vpc' },
        updatedAt: 'Active',
      },
      {
        id: 'aws-res-4',
        name: 'app_sg',
        type: 'aws_security_group',
        provider: 'aws',
        category: 'security',
        hcl: `# AWS Web Security Group
resource "aws_security_group" "app_sg" {
  name        = "app-web-sg"
  description = "Security group for web and SSH ingress"
  vpc_id      = aws_vpc.prod_vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`,
        params: { ingressPorts: '22, 80, 443' },
        updatedAt: 'Active',
      },
      {
        id: 'aws-res-5',
        name: 'web_instance',
        type: 'aws_instance',
        provider: 'aws',
        category: 'compute',
        hcl: `# AWS EC2 Instance
resource "aws_instance" "web_instance" {
  ami           = "ami-0c7217cdde317cfec"
  instance_type = var.aws_instance_type
  subnet_id     = aws_subnet.public_subnet.id
  vpc_security_group_ids = [aws_security_group.app_sg.id]

  root_block_device {
    volume_size = 40
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name = "prod-web-server"
  }
}`,
        params: { instanceType: 't3.medium', diskSize: 40, ami: 'ami-0c7217cdde317cfec' },
        updatedAt: 'Active',
      },
      {
        id: 'aws-res-6',
        name: 'prod_storage',
        type: 'aws_s3_bucket',
        provider: 'aws',
        category: 'storage',
        hcl: `# AWS S3 Storage Bucket & Bucket Policies
resource "aws_s3_bucket" "prod_storage" {
  bucket = "enterprise-storage-prod-unique"

  tags = {
    Name = "enterprise-storage"
  }
}

resource "aws_s3_bucket_versioning" "prod_storage_ver" {
  bucket = aws_s3_bucket.prod_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "prod_storage_pab" {
  bucket = aws_s3_bucket.prod_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,
        params: { bucketName: 'enterprise-storage-prod-unique', versioning: true },
        updatedAt: 'Active',
      },
    ];

    const defaultAzureStack: InfrastructureResource[] = [
      {
        id: 'az-res-1',
        name: 'prod_rg',
        type: 'azurerm_resource_group',
        provider: 'azure',
        category: 'network',
        hcl: `# Azure Resource Group
resource "azurerm_resource_group" "prod_rg" {
  name     = "rg-prod-enterprise"
  location = var.azure_location

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform Automation"
  }
}`,
        params: { location: 'eastus' },
        updatedAt: 'Active',
      },
      {
        id: 'az-res-2',
        name: 'prod_vnet',
        type: 'azurerm_virtual_network',
        provider: 'azure',
        category: 'network',
        hcl: `# Azure Virtual Network & Subnet
resource "azurerm_virtual_network" "prod_vnet" {
  name                = "prod-vnet"
  resource_group_name = azurerm_resource_group.prod_rg.name
  location            = azurerm_resource_group.prod_rg.location
  address_space       = [var.azure_vnet_cidr]
}

resource "azurerm_subnet" "prod_subnet" {
  name                 = "default-subnet"
  resource_group_name  = azurerm_resource_group.prod_rg.name
  virtual_network_name = azurerm_virtual_network.prod_vnet.name
  address_prefixes     = ["10.1.1.0/24"]
}`,
        params: { cidr: '10.1.0.0/16', subnetCidr: '10.1.1.0/24' },
        updatedAt: 'Active',
      },
      {
        id: 'az-res-3',
        name: 'prod_pip',
        type: 'azurerm_public_ip',
        provider: 'azure',
        category: 'network',
        hcl: `# Azure Public IP & NIC
resource "azurerm_public_ip" "prod_pip" {
  name                = "pip-prod-app"
  location            = azurerm_resource_group.prod_rg.location
  resource_group_name = azurerm_resource_group.prod_rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_interface" "prod_nic" {
  name                = "nic-prod-app-01"
  location            = azurerm_resource_group.prod_rg.location
  resource_group_name = azurerm_resource_group.prod_rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.prod_subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.prod_pip.id
  }
}`,
        params: { allocation: 'Static', sku: 'Standard' },
        updatedAt: 'Active',
      },
      {
        id: 'az-res-4',
        name: 'prod_nsg',
        type: 'azurerm_network_security_group',
        provider: 'azure',
        category: 'security',
        hcl: `# Azure Network Security Group & Subnet Association
resource "azurerm_network_security_group" "prod_nsg" {
  name                = "app-nsg"
  location            = azurerm_resource_group.prod_rg.location
  resource_group_name = azurerm_resource_group.prod_rg.name

  security_rule {
    name                       = "Allow-SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-HTTP"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "subnet_assoc" {
  subnet_id                 = azurerm_subnet.prod_subnet.id
  network_security_group_id = azurerm_network_security_group.prod_nsg.id
}`,
        params: { rules: 'Allow-SSH, Allow-HTTP' },
        updatedAt: 'Active',
      },
      {
        id: 'az-res-5',
        name: 'prod_vm',
        type: 'azurerm_linux_virtual_machine',
        provider: 'azure',
        category: 'compute',
        hcl: `# Azure Linux Virtual Machine
resource "azurerm_linux_virtual_machine" "prod_vm" {
  name                = "vm-prod-app-01"
  resource_group_name = azurerm_resource_group.prod_rg.name
  location            = azurerm_resource_group.prod_rg.location
  size                = var.azure_vm_size
  admin_username      = "azureuser"
  network_interface_ids = [azurerm_network_interface.prod_nic.id]

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}`,
        params: { vmSize: 'Standard_B2s', adminUser: 'azureuser' },
        updatedAt: 'Active',
      },
      {
        id: 'az-res-6',
        name: 'prod_storage',
        type: 'azurerm_storage_account',
        provider: 'azure',
        category: 'storage',
        hcl: `# Azure Storage Account & Blob Container
resource "azurerm_storage_account" "prod_storage" {
  name                     = "mystorageaccountprod12"
  resource_group_name      = azurerm_resource_group.prod_rg.name
  location                 = azurerm_resource_group.prod_rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = {
    Environment = var.environment
  }
}

resource "azurerm_storage_container" "prod_container" {
  name                  = "app-blobs"
  storage_account_name  = azurerm_storage_account.prod_storage.name
  container_access_type = "private"
}`,
        params: { storageName: 'mystorageaccountprod12', tier: 'Standard' },
        updatedAt: 'Active',
      },
    ];

    setResources([...defaultAwsStack, ...defaultAzureStack]);
  }, [activeProject]);

  // Dynamic HCL synthesizer for any AWS or Azure resource
  const synthesizeHcl = (
    provider: 'aws' | 'azure',
    type: string,
    name: string,
    params: Record<string, any>
  ): string => {
    const cleanName = name.replace(/[^a-zA-Z0-9_]/g, '_');
    if (provider === 'aws') {
      switch (type) {
        case 'aws_internet_gateway':
          return `# AWS Internet Gateway & Public Route Table
resource "aws_internet_gateway" "${cleanName}" {
  vpc_id = aws_vpc.prod_vpc.id

  tags = {
    Name        = "${name}"
    Environment = var.environment
  }
}

resource "aws_route_table" "${cleanName}_rt" {
  vpc_id = aws_vpc.prod_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.${cleanName}.id
  }

  tags = {
    Name = "${name}-route-table"
  }
}`;
        case 'aws_vpc':
          return `# AWS Virtual Private Cloud
resource "aws_vpc" "${cleanName}" {
  cidr_block           = "${params.cidr || '10.0.0.0/16'}"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${name}"
    Environment = var.environment
    ManagedBy   = "Terraform Automation"
  }
}`;
        case 'aws_subnet':
          return `# AWS Subnet
resource "aws_subnet" "${cleanName}" {
  vpc_id                  = aws_vpc.prod_vpc.id
  cidr_block              = "${params.cidr || '10.0.2.0/24'}"
  availability_zone       = "${params.az || 'us-east-1a'}"
  map_public_ip_on_launch = true

  tags = {
    Name = "${name}"
    Tier = "Public"
  }
}`;
        case 'aws_instance':
          return `# AWS EC2 Instance
resource "aws_instance" "${cleanName}" {
  ami           = "${params.ami || 'ami-0c7217cdde317cfec'}"
  instance_type = "${params.instanceType || 't3.medium'}"
  subnet_id     = aws_subnet.public_subnet.id

  root_block_device {
    volume_size = ${params.diskSize || 40}
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name        = "${name}"
    Environment = var.environment
  }
}`;
        case 'aws_s3_bucket':
          return `# AWS S3 Storage Bucket & Policies
resource "aws_s3_bucket" "${cleanName}" {
  bucket = "${params.bucketName || cleanName}"

  tags = {
    Name = "${name}"
  }
}

resource "aws_s3_bucket_versioning" "ver_${cleanName}" {
  bucket = aws_s3_bucket.${cleanName}.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "pab_${cleanName}" {
  bucket = aws_s3_bucket.${cleanName}.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`;
        case 'aws_security_group':
          return `# AWS Security Group
resource "aws_security_group" "${cleanName}" {
  name        = "${name}"
  description = "Security rules for web and management ingress"
  vpc_id      = aws_vpc.prod_vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`;
        case 'aws_eip':
          return `# AWS Elastic IP
resource "aws_eip" "${cleanName}" {
  domain = "vpc"

  tags = {
    Name = "${name}"
  }
}`;
        default:
          return `# AWS Resource: ${type}\nresource "${type}" "${cleanName}" {\n  # Configuration parameters\n}`;
      }
    } else {
      // Azure
      switch (type) {
        case 'azurerm_resource_group':
          return `# Azure Resource Group
resource "azurerm_resource_group" "${cleanName}" {
  name     = "${name}"
  location = "${params.location || 'eastus'}"

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform Automation"
  }
}`;
        case 'azurerm_virtual_network':
          return `# Azure Virtual Network & Subnet
resource "azurerm_virtual_network" "${cleanName}" {
  name                = "${name}"
  resource_group_name = azurerm_resource_group.prod_rg.name
  location            = azurerm_resource_group.prod_rg.location
  address_space       = ["${params.cidr || '10.2.0.0/16'}"]
}`;
        case 'azurerm_subnet':
          return `# Azure Subnet
resource "azurerm_subnet" "${cleanName}" {
  name                 = "${name}"
  resource_group_name  = azurerm_resource_group.prod_rg.name
  virtual_network_name = azurerm_virtual_network.prod_vnet.name
  address_prefixes     = ["${params.subnetCidr || '10.1.2.0/24'}"]
}`;
        case 'azurerm_public_ip':
          return `# Azure Public IP Address
resource "azurerm_public_ip" "${cleanName}" {
  name                = "${name}"
  location            = azurerm_resource_group.prod_rg.location
  resource_group_name = azurerm_resource_group.prod_rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}`;
        case 'azurerm_network_interface':
          return `# Azure Network Interface
resource "azurerm_network_interface" "${cleanName}" {
  name                = "${name}"
  location            = azurerm_resource_group.prod_rg.location
  resource_group_name = azurerm_resource_group.prod_rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.prod_subnet.id
    private_ip_address_allocation = "Dynamic"
  }
}`;
        case 'azurerm_linux_virtual_machine':
          return `# Azure Linux Virtual Machine
resource "azurerm_linux_virtual_machine" "${cleanName}" {
  name                = "${name}"
  resource_group_name = azurerm_resource_group.prod_rg.name
  location            = azurerm_resource_group.prod_rg.location
  size                = "${params.vmSize || 'Standard_B2s'}"
  admin_username      = "${params.adminUser || 'azureuser'}"
  network_interface_ids = [azurerm_network_interface.prod_nic.id]

  admin_ssh_key {
    username   = "${params.adminUser || 'azureuser'}"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}`;
        case 'azurerm_storage_account':
          return `# Azure Storage Account & Container
resource "azurerm_storage_account" "${cleanName}" {
  name                     = "${params.storageName || cleanName}"
  resource_group_name      = azurerm_resource_group.prod_rg.name
  location                 = "${params.location || 'eastus'}"
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = {
    Environment = var.environment
  }
}`;
        case 'azurerm_network_security_group':
          return `# Azure Network Security Group
resource "azurerm_network_security_group" "${cleanName}" {
  name                = "${name}"
  location            = "${params.location || 'eastus'}"
  resource_group_name = azurerm_resource_group.prod_rg.name

  security_rule {
    name                       = "Allow-SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}`;
        default:
          return `# Azure Resource: ${type}\nresource "${type}" "${cleanName}" {\n  # Configuration parameters\n}`;
      }
    }
  };

  // Keep live preview updated for Create Modal
  const previewCreateHcl = useMemo(() => {
    return synthesizeHcl(newResProvider, newResType, newResName, newResParams);
  }, [newResProvider, newResType, newResName, newResParams]);

  // ==========================================
  // CREATE RESOURCE HANDLERS
  // ==========================================
  const handleOpenCreateModal = () => {
    setNewResProvider('aws');
    setNewResCategory('network');
    setNewResType('aws_internet_gateway');
    setNewResName('app_internet_gateway');
    setCreateModeTab('params');
    setCustomCreateHcl('');
    setShowCreateModal(true);
  };

  const handleCreateResourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResName.trim()) return;

    const finalHcl =
      createModeTab === 'raw_hcl' && customCreateHcl.trim()
        ? customCreateHcl
        : previewCreateHcl;

    const newRes: InfrastructureResource = {
      id: `${newResProvider}-res-${Date.now()}`,
      name: newResName.trim(),
      type: newResType,
      provider: newResProvider,
      category: newResCategory,
      hcl: finalHcl,
      params: { ...newResParams },
      updatedAt: 'Just now',
    };

    setResources((prev) => [newRes, ...prev]);

    // Auto-create variable if selected
    if (autoAddVariable) {
      const varIdName = `${newResName.replace(/[^a-zA-Z0-9_]/g, '_')}_config`;
      if (!variablesList.some((v) => v.name === varIdName)) {
        setVariablesList((prev) => [
          ...prev,
          {
            id: `var-${Date.now()}`,
            name: varIdName,
            type: 'string',
            defaultValue: newResProvider === 'aws' ? 'us-east-1' : 'eastus',
            description: `Configuration reference for ${newResName}`,
            sensitive: false,
          },
        ]);
      }
    }

    // Auto-create output if selected
    if (autoAddOutput) {
      const outIdName = `${newResName.replace(/[^a-zA-Z0-9_]/g, '_')}_id`;
      if (!outputsList.some((o) => o.name === outIdName)) {
        setOutputsList((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            name: outIdName,
            value: `${newResType}.${newResName.replace(/[^a-zA-Z0-9_]/g, '_')}.id`,
            description: `Provisioned ID for ${newResName}`,
            sensitive: false,
          },
        ]);
      }
    }

    setShowCreateModal(false);
  };

  // ==========================================
  // EDIT RESOURCE HANDLERS
  // ==========================================
  const handleOpenEditModal = (res: InfrastructureResource) => {
    setEditingResource(res);
    setEditName(res.name);
    setEditHcl(res.hcl);
    setShowEditModal(true);
  };

  const handleSaveEditedResource = () => {
    if (!editingResource) return;
    setResources((prev) =>
      prev.map((r) =>
        r.id === editingResource.id
          ? {
              ...r,
              name: editName.trim() || r.name,
              hcl: editHcl,
              updatedAt: 'Edited just now',
            }
          : r
      )
    );
    setShowEditModal(false);
    setEditingResource(null);
  };

  // ==========================================
  // DELETE RESOURCE HANDLERS
  // ==========================================
  const handleOpenDeleteModal = (res: InfrastructureResource) => {
    setResourceToDelete(res);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!resourceToDelete) return;
    setResources((prev) => prev.filter((r) => r.id !== resourceToDelete.id));
    setShowDeleteModal(false);
    setResourceToDelete(null);
  };

  // ==========================================
  // VARIABLES CRUD ACTIONS
  // ==========================================
  const handleOpenAddVar = () => {
    setVarEditingId(null);
    setVarName('');
    setVarType('string');
    setVarDefault('');
    setVarDesc('');
    setVarSensitive(false);
    setShowVarModal(true);
  };

  const handleOpenEditVar = (v: InfrastructureVariable) => {
    setVarEditingId(v.id);
    setVarName(v.name);
    setVarType(v.type);
    setVarDefault(v.defaultValue);
    setVarDesc(v.description);
    setVarSensitive(v.sensitive);
    setShowVarModal(true);
  };

  const handleSaveVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!varName.trim()) return;

    if (varEditingId) {
      setVariablesList((prev) =>
        prev.map((v) =>
          v.id === varEditingId
            ? {
                ...v,
                name: varName.trim(),
                type: varType,
                defaultValue: varDefault,
                description: varDesc,
                sensitive: varSensitive,
              }
            : v
        )
      );
    } else {
      setVariablesList((prev) => [
        ...prev,
        {
          id: `var-${Date.now()}`,
          name: varName.trim(),
          type: varType,
          defaultValue: varDefault,
          description: varDesc,
          sensitive: varSensitive,
        },
      ]);
    }
    setShowVarModal(false);
  };

  const handleDeleteVariable = (id: string) => {
    setVariablesList((prev) => prev.filter((v) => v.id !== id));
  };

  // ==========================================
  // OUTPUTS CRUD ACTIONS
  // ==========================================
  const handleOpenAddOut = () => {
    setOutEditingId(null);
    setOutName('');
    setOutValue('');
    setOutDesc('');
    setOutSensitive(false);
    setShowOutModal(true);
  };

  const handleOpenEditOut = (o: InfrastructureOutput) => {
    setOutEditingId(o.id);
    setOutName(o.name);
    setOutValue(o.value);
    setOutDesc(o.description);
    setOutSensitive(o.sensitive);
    setShowOutModal(true);
  };

  const handleSaveOutput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outName.trim() || !outValue.trim()) return;

    if (outEditingId) {
      setOutputsList((prev) =>
        prev.map((o) =>
          o.id === outEditingId
            ? {
                ...o,
                name: outName.trim(),
                value: outValue.trim(),
                description: outDesc,
                sensitive: outSensitive,
              }
            : o
        )
      );
    } else {
      setOutputsList((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          name: outName.trim(),
          value: outValue.trim(),
          description: outDesc,
          sensitive: outSensitive,
        },
      ]);
    }
    setShowOutModal(false);
  };

  const handleDeleteOutput = (id: string) => {
    setOutputsList((prev) => prev.filter((o) => o.id !== id));
  };

  // ==========================================
  // SAVE ENTIRE STACK: main.tf + variables.tf + outputs.tf
  // ==========================================
  const handleSaveAllStackFiles = async () => {
    if (!activeProject?._id) return;
    setIsSavingStack(true);
    try {
      const hasAws = resources.some((r) => r.provider === 'aws');
      const hasAzure = resources.some((r) => r.provider === 'azure');

      let providerHeader = `terraform {\n  required_version = ">= 1.5.0"\n  required_providers {\n`;
      if (hasAws) {
        providerHeader += `    aws = {\n      source  = "hashicorp/aws"\n      version = "~> 5.0"\n    }\n`;
      }
      if (hasAzure) {
        providerHeader += `    azurerm = {\n      source  = "hashicorp/azurerm"\n      version = "~> 3.0"\n    }\n`;
      }
      providerHeader += `  }\n}\n\n`;

      if (hasAws) {
        providerHeader += `provider "aws" {\n  region = var.aws_region\n}\n\n`;
      }
      if (hasAzure) {
        providerHeader += `provider "azurerm" {\n  features {}\n}\n\n`;
      }

      const allResourcesHcl = resources.map((r) => r.hcl).join('\n\n');
      const compiledMainTf = `${providerHeader}# ==========================================\n# CLOUD RESOURCES (${resources.length})\n# ==========================================\n\n${allResourcesHcl}\n`;

      const varsHcl = variablesList
        .map(
          (v) => `variable "${v.name}" {
  type        = ${v.type}
  default     = ${v.defaultValue ? JSON.stringify(v.defaultValue) : 'null'}
  description = ${JSON.stringify(v.description || '')}
  sensitive   = ${v.sensitive}
}`
        )
        .join('\n\n');
      const compiledVariablesTf = `# ==========================================\n# PROJECT INPUT VARIABLES (${variablesList.length})\n# ==========================================\n\n${varsHcl}\n`;

      const outsHcl = outputsList
        .map(
          (o) => `output "${o.name}" {
  value       = ${o.value}
  description = ${JSON.stringify(o.description || '')}
  sensitive   = ${o.sensitive}
}`
        )
        .join('\n\n');
      const compiledOutputsTf = `# ==========================================\n# PROJECT INFRASTRUCTURE OUTPUTS (${outputsList.length})\n# ==========================================\n\n${outsHcl}\n`;

      if (onSaveFiles) {
        const otherFiles = (activeProject.files || []).filter(
          (f: any) => f.name !== 'main.tf' && f.name !== 'variables.tf' && f.name !== 'outputs.tf'
        );
        const updatedFiles = [
          { name: 'main.tf', content: compiledMainTf },
          { name: 'variables.tf', content: compiledVariablesTf },
          { name: 'outputs.tf', content: compiledOutputsTf },
          ...otherFiles,
        ];
        await onSaveFiles(updatedFiles);
      } else {
        await onAppendCodeToProject(compiledMainTf, 'Consolidated Multi-Cloud Stack');
      }

      setStackSaveSuccess(true);
      setTimeout(() => setStackSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save stack:', e);
    } finally {
      setIsSavingStack(false);
    }
  };

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (cloudFilter !== 'all' && r.provider !== cloudFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.hcl.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [resources, cloudFilter, categoryFilter, searchFilter]);

  const awsCount = resources.filter((r) => r.provider === 'aws').length;
  const azureCount = resources.filter((r) => r.provider === 'azure').length;

  const handleCopyHcl = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResId(id);
    setTimeout(() => setCopiedResId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. TOP BUILDER BAR & WORKSPACE SWITCHER                  */}
      {/* ======================================================== */}
      <div className="bg-[#090F1E] border border-cyan-500/30 rounded-2xl p-5 shadow-2xl shadow-cyan-950/30 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Infrastructure Builder &amp; Architecture Synthesis
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                  Multi-Cloud Engine
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                  <AwsLogo className="w-3 h-3" />
                  <span>{awsCount} AWS</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold flex items-center gap-1">
                  <AzureLogo className="w-3 h-3" />
                  <span>{azureCount} Azure</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                  {variablesList.length} Variables
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                  {outputsList.length} Outputs
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Complete AWS (including Internet Gateway &amp; EC2) &amp; Azure infrastructure automation with Create, Edit, Variables, and Outputs.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#0D1526] p-1 rounded-xl border border-gray-800 flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setViewMode('canvas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'canvas'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-300" />
              <span>Stack Resources ({resources.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('variables')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'variables'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-purple-300" />
              <span>Variables ({variablesList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('outputs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'outputs'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-300" />
              <span>Outputs ({outputsList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('templates')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'templates'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Blueprints</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSwitchTab('code')}
            className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Code2 className="w-4 h-4 text-purple-400" />
            <span>Code Editor</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MODE: ACTIVE STACK RESOURCES (CREATE, EDIT, SAVE, REMOVE) */}
      {/* ======================================================== */}
      {viewMode === 'canvas' && (
        <div className="space-y-6">
          {/* Operations Action Bar */}
          <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* CREATE RESOURCE BUTTON */}
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Resource</span>
              </button>

              {/* SAVE ALL STACK FILES (main.tf + variables.tf + outputs.tf) */}
              <button
                type="button"
                onClick={handleSaveAllStackFiles}
                disabled={isSavingStack || resources.length === 0}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/30 disabled:opacity-50"
              >
                <Save className={`w-4 h-4 ${isSavingStack ? 'animate-spin' : ''}`} />
                <span>{isSavingStack ? 'Saving Stack...' : 'Save Stack to Project (main + vars + outputs)'}</span>
              </button>

              {/* CLEAR STACK */}
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear all resources from this canvas stack?')) {
                    setResources([]);
                  }
                }}
                disabled={resources.length === 0}
                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Stack</span>
              </button>
            </div>

            {/* Cloud and Category Filters */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Cloud Filter: ALL, AWS, AZURE */}
              <div className="flex items-center gap-1 bg-[#080D1A] p-1 rounded-xl border border-gray-800">
                <button
                  type="button"
                  onClick={() => setCloudFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                    cloudFilter === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All ({resources.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCloudFilter('aws')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer flex items-center gap-1 ${
                    cloudFilter === 'aws'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <AwsLogo className="w-3 h-3" />
                  <span>AWS ({awsCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCloudFilter('azure')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer flex items-center gap-1 ${
                    cloudFilter === 'azure'
                      ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <AzureLogo className="w-3 h-3" />
                  <span>Azure ({azureCount})</span>
                </button>
              </div>

              {/* Search box */}
              <div className="relative min-w-[170px]">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter resources..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#080D1A] border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Category Filter */}
              {(['all', 'network', 'compute', 'storage', 'security'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer border ${
                    categoryFilter === cat
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                      : 'bg-[#080D1A] border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {stackSaveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                Infrastructure stack successfully compiled and saved to project's <strong>main.tf</strong>, <strong>variables.tf</strong>, and <strong>outputs.tf</strong>!
              </span>
            </div>
          )}

          {/* Resources Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResources.map((res) => {
              const isAws = res.provider === 'aws';
              return (
                <div
                  key={res.id}
                  className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-purple-500/50 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isAws ? <AwsLogo className="w-4 h-4" /> : <AzureLogo className="w-4 h-4" />}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                          isAws ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        }`}>
                          {res.type}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-gray-500 font-semibold">
                        {res.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                        <span>{res.name}</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                        Provider: <strong className={isAws ? 'text-amber-400 uppercase' : 'text-blue-400 uppercase'}>{res.provider}</strong> • {res.updatedAt}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {Object.entries(res.params).map(([k, v]) => (
                        <span
                          key={k}
                          className="px-2 py-0.5 rounded bg-[#080D1A] text-gray-300 border border-gray-800 text-[10px] font-mono"
                        >
                          {k}: <strong className="text-cyan-300">{String(v)}</strong>
                        </span>
                      ))}
                    </div>

                    <div className="pt-2">
                      <pre className="p-3 rounded-xl bg-[#060A14] border border-gray-800 text-[11px] font-mono text-cyan-300/80 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                        {res.hcl}
                      </pre>
                    </div>
                  </div>

                  {/* Actions Bar: Edit, Save, Copy, Remove */}
                  <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyHcl(res.id, res.hcl)}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-800 text-gray-300 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                      title="Copy HCL Code"
                    >
                      {copiedResId === res.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedResId === res.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(res)}
                        className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Edit Resource"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(res)}
                        className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 transition cursor-pointer"
                        title="Remove Resource from Stack"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODE: VARIABLES MANAGER (variables.tf)                */}
      {/* ======================================================== */}
      {viewMode === 'variables' && (
        <div className="space-y-6">
          <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Project Variables Manager (variables.tf)</h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Define and manage input variables for AWS &amp; Azure (regions, instance sizes, CIDR blocks, and environment tags).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddVar}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-950/40"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Variable</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllStackFiles}
                disabled={isSavingStack}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save variables.tf</span>
              </button>
            </div>
          </div>

          {/* Variables Table */}
          <div className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#080D1A] text-gray-400 border-b border-[#1E293B] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Variable Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Default Value</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Sensitive</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {variablesList.map((v) => (
                    <tr key={v.id} className="hover:bg-[#131D35]/50 transition">
                      <td className="py-3 px-4 font-bold text-cyan-300">{v.name}</td>
                      <td className="py-3 px-4 text-purple-300 font-bold">{v.type}</td>
                      <td className="py-3 px-4 text-gray-200">{v.defaultValue || '(none)'}</td>
                      <td className="py-3 px-4 text-gray-400 max-w-[200px] truncate">{v.description || '-'}</td>
                      <td className="py-3 px-4">
                        {v.sensitive ? (
                          <span className="px-2 py-0.5 rounded text-[9px] bg-red-500/20 text-red-300 font-bold">YES</span>
                        ) : (
                          <span className="text-gray-500">NO</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditVar(v)}
                          className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariable(v.id)}
                          className="p-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODE: OUTPUTS MANAGER (outputs.tf)                    */}
      {/* ======================================================== */}
      {viewMode === 'outputs' && (
        <div className="space-y-6">
          <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Stack Outputs Manager (outputs.tf)</h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Export and inspect deployment endpoints, ARNs, public IPs, and IDs for both AWS &amp; Azure.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddOut}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Output</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllStackFiles}
                disabled={isSavingStack}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save outputs.tf</span>
              </button>
            </div>
          </div>

          {/* Outputs Table */}
          <div className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#080D1A] text-gray-400 border-b border-[#1E293B] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Output Identifier</th>
                    <th className="py-3 px-4">Value Expression</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Sensitive</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {outputsList.map((o) => (
                    <tr key={o.id} className="hover:bg-[#131D35]/50 transition">
                      <td className="py-3 px-4 font-bold text-emerald-400">{o.name}</td>
                      <td className="py-3 px-4 text-cyan-300 font-bold">{o.value}</td>
                      <td className="py-3 px-4 text-gray-400 max-w-[200px] truncate">{o.description || '-'}</td>
                      <td className="py-3 px-4">
                        {o.sensitive ? (
                          <span className="px-2 py-0.5 rounded text-[9px] bg-red-500/20 text-red-300 font-bold">YES</span>
                        ) : (
                          <span className="text-gray-500">NO</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditOut(o)}
                          className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOutput(o.id)}
                          className="p-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODE: CLOUD BLUEPRINTS & MULTI-FILE HCL               */}
      {/* ======================================================== */}
      {viewMode === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ENTERPRISE_TERRAFORM_TEMPLATES.map((tpl) => {
              const isAws = tpl.provider === 'aws';
              return (
                <div
                  key={tpl.id}
                  className="p-4 rounded-2xl border border-gray-800 bg-[#0D1526]/75 hover:border-gray-700 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isAws ? <AwsLogo className="w-4 h-4" /> : <AzureLogo className="w-4 h-4" />}
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-400">
                          {tpl.category}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-[#080D1A] text-cyan-300 font-bold">
                        {tpl.provider}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">{tpl.name}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2">{tpl.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onApplyTemplateToProject && onApplyTemplateToProject(tpl)}
                    className="w-full py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Load Blueprint into Stack</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE RESOURCE (AWS & AZURE + EDIT INSIDE + VARS & OUTS) */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#090F1E] border border-cyan-500/40 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 my-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Create Infrastructure Resource</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode switch inside Create Modal: Visual Parameters vs Edit Raw HCL */}
            <div className="flex items-center justify-between bg-[#0D1526] p-1.5 rounded-xl border border-gray-800">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCreateModeTab('params')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    createModeTab === 'params'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  1. Configure Parameters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!customCreateHcl) setCustomCreateHcl(previewCreateHcl);
                    setCreateModeTab('raw_hcl');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    createModeTab === 'raw_hcl'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>2. Edit Raw HCL Code</span>
                </button>
              </div>

              <span className="text-[11px] text-gray-500 font-mono pr-2">
                {createModeTab === 'params' ? 'Guided Form' : 'Direct Code Edit'}
              </span>
            </div>

            <form onSubmit={handleCreateResourceSubmit} className="space-y-4 text-xs">
              {/* Cloud Provider Selection */}
              <div>
                <label className="text-gray-300 font-bold block mb-1.5">Target Cloud Provider:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNewResProvider('aws');
                      setNewResCategory('network');
                      setNewResType('aws_internet_gateway');
                      setNewResName('app_internet_gateway');
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition cursor-pointer ${
                      newResProvider === 'aws'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-950/40'
                        : 'bg-[#0D1526] border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <AwsLogo className="w-5 h-5" />
                    <span>Amazon Web Services (AWS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewResProvider('azure');
                      setNewResCategory('network');
                      setNewResType('azurerm_virtual_network');
                      setNewResName('app_vnet');
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition cursor-pointer ${
                      newResProvider === 'azure'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-md shadow-blue-950/40'
                        : 'bg-[#0D1526] border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <AzureLogo className="w-5 h-5" />
                    <span>Microsoft Azure Cloud</span>
                  </button>
                </div>
              </div>

              {/* Resource Category & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">Resource Category:</label>
                  <select
                    value={newResCategory}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setNewResCategory(cat);
                      if (newResProvider === 'aws') {
                        if (cat === 'network') setNewResType('aws_internet_gateway');
                        else if (cat === 'compute') setNewResType('aws_instance');
                        else if (cat === 'storage') setNewResType('aws_s3_bucket');
                        else if (cat === 'security') setNewResType('aws_security_group');
                      } else {
                        if (cat === 'network') setNewResType('azurerm_virtual_network');
                        else if (cat === 'compute') setNewResType('azurerm_linux_virtual_machine');
                        else if (cat === 'storage') setNewResType('azurerm_storage_account');
                        else if (cat === 'security') setNewResType('azurerm_network_security_group');
                      }
                    }}
                    className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="network">Networking</option>
                    <option value="compute">Compute</option>
                    <option value="storage">Storage</option>
                    <option value="security">Security</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">Resource Type:</label>
                  <select
                    value={newResType}
                    onChange={(e) => setNewResType(e.target.value)}
                    className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                  >
                    {newResProvider === 'aws' ? (
                      <>
                        <option value="aws_internet_gateway">aws_internet_gateway (Internet Gateway)</option>
                        <option value="aws_vpc">aws_vpc (VPC)</option>
                        <option value="aws_subnet">aws_subnet (Subnet)</option>
                        <option value="aws_instance">aws_instance (EC2 Virtual Machine)</option>
                        <option value="aws_s3_bucket">aws_s3_bucket (S3 Storage Bucket)</option>
                        <option value="aws_security_group">aws_security_group (Firewall Rules)</option>
                        <option value="aws_eip">aws_eip (Elastic Public IP)</option>
                      </>
                    ) : (
                      <>
                        <option value="azurerm_resource_group">azurerm_resource_group (Resource Group)</option>
                        <option value="azurerm_virtual_network">azurerm_virtual_network (VNet)</option>
                        <option value="azurerm_subnet">azurerm_subnet (Subnet)</option>
                        <option value="azurerm_public_ip">azurerm_public_ip (Public IP)</option>
                        <option value="azurerm_network_interface">azurerm_network_interface (NIC)</option>
                        <option value="azurerm_network_security_group">azurerm_network_security_group (NSG)</option>
                        <option value="azurerm_linux_virtual_machine">azurerm_linux_virtual_machine (Linux VM)</option>
                        <option value="azurerm_storage_account">azurerm_storage_account (Blob Storage)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">Resource Identifier / Name:</label>
                <input
                  type="text"
                  value={newResName}
                  onChange={(e) => setNewResName(e.target.value)}
                  className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                  placeholder="e.g. app_gateway, web_server, prod_db"
                  required
                />
              </div>

              {/* Variables & Outputs Auto-binding */}
              <div className="p-3 rounded-xl bg-[#080D1A] border border-gray-800 space-y-2">
                <span className="text-[11px] font-bold text-gray-300 block">Variables &amp; Outputs Integration:</span>
                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                    <input
                      type="checkbox"
                      checked={autoAddVariable}
                      onChange={(e) => setAutoAddVariable(e.target.checked)}
                      className="rounded border-gray-700 bg-gray-900"
                    />
                    <span>Auto-create project variable in <strong>variables.tf</strong></span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                    <input
                      type="checkbox"
                      checked={autoAddOutput}
                      onChange={(e) => setAutoAddOutput(e.target.checked)}
                      className="rounded border-gray-700 bg-gray-900"
                    />
                    <span>Auto-export resource output in <strong>outputs.tf</strong></span>
                  </label>
                </div>
              </div>

              {/* Code Preview & Live Edit area */}
              {createModeTab === 'raw_hcl' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-gray-400">
                    <label className="font-bold">Edit Raw HCL Configuration:</label>
                    <span className="text-[10px] text-cyan-400 font-mono">Direct custom edits supported</span>
                  </div>
                  <textarea
                    rows={8}
                    value={customCreateHcl || previewCreateHcl}
                    onChange={(e) => setCustomCreateHcl(e.target.value)}
                    className="w-full bg-[#060A14] border border-cyan-500/40 rounded-xl p-3 font-mono text-xs text-cyan-300 leading-relaxed focus:outline-none focus:border-cyan-300"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-gray-400">
                    <label className="font-bold">Generated Terraform HCL Preview:</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomCreateHcl(previewCreateHcl);
                        setCreateModeTab('raw_hcl');
                      }}
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Switch to Edit Code</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-[#060A14] border border-gray-800 text-[11px] font-mono text-cyan-300/90 max-h-36 overflow-y-auto leading-relaxed shadow-inner">
                    {previewCreateHcl}
                  </pre>
                </div>
              )}

              <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create &amp; Add to Stack</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT RESOURCE                                     */}
      {/* ======================================================== */}
      {showEditModal && editingResource && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090F1E] border border-purple-500/40 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  Edit Resource: <span className="font-mono text-cyan-300">{editingResource.name}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-gray-300 font-bold block mb-1">Resource Name:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-300 font-bold block">HCL Code Block:</label>
                <textarea
                  value={editHcl}
                  onChange={(e) => setEditHcl(e.target.value)}
                  rows={9}
                  className="w-full bg-[#060A14] border border-cyan-500/40 rounded-xl p-3 font-mono text-xs text-cyan-300 leading-relaxed focus:outline-none focus:border-cyan-300"
                />
              </div>

              <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedResource}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE RESOURCE CONFIRMATION                      */}
      {/* ======================================================== */}
      {showDeleteModal && resourceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090F1E] border border-red-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Resource</h3>
                <p className="text-xs text-gray-400">Remove this resource from the active stack canvas?</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0D1526] border border-gray-800 text-xs text-gray-300">
              Name: <strong className="text-white font-mono">{resourceToDelete.name}</strong>
              <br />
              Type: <span className="text-cyan-300 font-mono">{resourceToDelete.type}</span>
              <br />
              Provider: <span className="text-purple-300 font-mono uppercase">{resourceToDelete.provider}</span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT VARIABLE                               */}
      {/* ======================================================== */}
      {showVarModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090F1E] border border-purple-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {varEditingId ? 'Edit Variable' : 'Add Project Variable'}
              </h3>
              <button
                type="button"
                onClick={() => setShowVarModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVariable} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 font-bold block mb-1">Variable Identifier:</label>
                <input
                  type="text"
                  value={varName}
                  onChange={(e) => setVarName(e.target.value)}
                  placeholder="e.g. instance_type"
                  className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">Type:</label>
                <select
                  value={varType}
                  onChange={(e) => setVarType(e.target.value)}
                  className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="bool">bool</option>
                  <option value="list(string)">list(string)</option>
                  <option value="map(string)">map(string)</option>
                </select>
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">Default Value:</label>
                <input
                  type="text"
                  value={varDefault}
                  onChange={(e) => setVarDefault(e.target.value)}
                  placeholder="e.g. t3.medium"
                  className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">Description:</label>
                <input
                  type="text"
                  value={varDesc}
                  onChange={(e) => setVarDesc(e.target.value)}
                  placeholder="Variable purpose..."
                  className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="varSens"
                  checked={varSensitive}
                  onChange={(e) => setVarSensitive(e.target.checked)}
                />
                <label htmlFor="varSens" className="text-gray-300 font-semibold cursor-pointer">
                  Mark as Sensitive (hides value in CLI plan output)
                </label>
              </div>

              <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVarModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
                >
                  Save Variable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT OUTPUT                                 */}
      {/* ======================================================== */}
      {showOutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090F1E] border border-emerald-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {outEditingId ? 'Edit Output' : 'Add Infrastructure Output'}
              </h3>
              <button
                type="button"
                onClick={() => setShowOutModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOutput} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 font-bold block mb-1">Output Name:</label>
                <input
                  type="text"
                  value={outName}
                  onChange={(e) => setOutName(e.target.value)}
                  placeholder="e.g. web_public_ip"
                  className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">Value Expression:</label>
                <input
                  type="text"
                  value={outValue}
                  onChange={(e) => setOutValue(e.target.value)}
                  placeholder="e.g. aws_instance.web_instance.public_ip"
                  className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">Description:</label>
                <input
                  type="text"
                  value={outDesc}
                  onChange={(e) => setOutDesc(e.target.value)}
                  placeholder="Output purpose..."
                  className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="outSens"
                  checked={outSensitive}
                  onChange={(e) => setOutSensitive(e.target.checked)}
                />
                <label htmlFor="outSens" className="text-gray-300 font-semibold cursor-pointer">
                  Mark as Sensitive (redacts value in console output)
                </label>
              </div>

              <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOutModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  Save Output
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
