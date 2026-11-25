export const ENTERPRISE_TERRAFORM_TEMPLATES = [
  // --- AWS COMPREHENSIVE ALL-IN-ONE TEMPLATE ---
  {
    id: 'aws-fullstack-vpc-ec2-s3',
    name: 'AWS Full-Stack Infrastructure (VPC + Subnet + IGW + EC2 + S3)',
    provider: 'aws',
    category: 'Complete Stack',
    description: 'Production-ready end-to-end AWS stack: VPC, Public Subnet, Internet Gateway, Route Tables, Security Group, Ubuntu Linux EC2, and Secure S3 Storage.',
    resources: [
      'aws_vpc',
      'aws_subnet',
      'aws_internet_gateway',
      'aws_route_table',
      'aws_route_table_association',
      'aws_security_group',
      'aws_instance',
      'aws_s3_bucket',
      'aws_s3_bucket_versioning',
      'aws_s3_bucket_public_access_block',
    ],
    files: [
      {
        name: 'main.tf',
        content: `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Virtual Private Cloud (VPC)
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "\${var.project_name}-vpc"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 2. Internet Gateway
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "\${var.project_name}-igw"
    Environment = var.environment
  }
}

# 3. Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.subnet_cidr
  availability_zone       = "\${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name        = "\${var.project_name}-public-subnet"
    Environment = var.environment
    Tier        = "Public"
  }
}

# 4. Route Table & Route to Internet Gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name        = "\${var.project_name}-public-rt"
    Environment = var.environment
  }
}

# 5. Route Table Association (Subnet Level)
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# 6. Web & Management Security Group
resource "aws_security_group" "web_sg" {
  name        = "\${var.project_name}-web-sg"
  description = "Allow inbound SSH, HTTP, HTTPS and all outbound traffic"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "HTTP access"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS access"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "\${var.project_name}-web-sg"
    Environment = var.environment
  }
}

# 7. AMI Lookup for Ubuntu 22.04 LTS
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 8. EC2 Linux Virtual Machine
resource "aws_instance" "app_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.web_sg.id]
  associate_public_ip_address = true

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y curl nginx
              systemctl enable nginx
              systemctl start nginx
              echo "<h1>Deployed via Enterprise Terraform Automation Center</h1>" > /var/www/html/index.html
              EOF

  tags = {
    Name        = "\${var.project_name}-ec2-linux"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 9. S3 Storage Bucket
resource "aws_s3_bucket" "storage" {
  bucket        = "\${var.project_name}-storage-\${var.environment}-\${var.aws_region}"
  force_destroy = false

  tags = {
    Name        = "\${var.project_name}-s3-storage"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "storage_versioning" {
  bucket = aws_s3_bucket.storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Block Public Access Guardrail
resource "aws_s3_bucket_public_access_block" "storage_pab" {
  bucket = aws_s3_bucket.storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
`,
      },
      {
        name: 'variables.tf',
        content: `variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Target AWS Region"
}

variable "project_name" {
  type        = string
  default     = "cloudops-demo"
  description = "Project identifier for naming resources"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Target deployment environment (dev, test, staging, production)"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR block for the VPC"
}

variable "subnet_cidr" {
  type        = string
  default     = "10.0.1.0/24"
  description = "CIDR block for the public subnet"
}

variable "instance_type" {
  type        = string
  default     = "t3.micro"
  description = "EC2 instance size"
}

variable "allowed_ssh_cidr" {
  type        = string
  default     = "0.0.0.0/0"
  description = "Source IP CIDR permitted for SSH ingress (restrict to corporate IP in production)"
}
`,
      },
      {
        name: 'outputs.tf',
        content: `output "vpc_id" {
  description = "ID of the created AWS VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.gw.id
}

output "ec2_instance_id" {
  description = "ID of the deployed EC2 Linux instance"
  value       = aws_instance.app_server.id
}

output "ec2_public_ip" {
  description = "Public IP address of the EC2 Linux instance"
  value       = aws_instance.app_server.public_ip
}

output "s3_bucket_name" {
  description = "Name of the provisioned S3 Storage Bucket"
  value       = aws_s3_bucket.storage.id
}

output "s3_bucket_arn" {
  description = "ARN of the provisioned S3 Storage Bucket"
  value       = aws_s3_bucket.storage.arn
}
`,
      },
    ],
  },

  // --- AZURE COMPREHENSIVE ALL-IN-ONE TEMPLATE ---
  {
    id: 'azure-fullstack-rg-vnet-vm-storage',
    name: 'Azure Full-Stack Infrastructure (RG + VNet + Subnet + Public IP + NIC + NSG Subnet Association + Linux VM + Storage Account)',
    provider: 'azure',
    category: 'Complete Stack',
    description: 'Complete production Azure stack: Resource Group, VNet, Subnet, Public IP, Network Security Group (NSG) associated at Subnet Level, NIC, Ubuntu Linux VM, and Storage Account with Blob Container.',
    resources: [
      'azurerm_resource_group',
      'azurerm_virtual_network',
      'azurerm_subnet',
      'azurerm_public_ip',
      'azurerm_network_security_group',
      'azurerm_subnet_network_security_group_association',
      'azurerm_network_interface',
      'azurerm_linux_virtual_machine',
      'azurerm_storage_account',
      'azurerm_storage_container',
    ],
    files: [
      {
        name: 'main.tf',
        content: `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "azurerm" {
  features {}
}

# Random suffix for globally unique Azure Storage Account name
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# 1. Resource Group
resource "azurerm_resource_group" "rg" {
  name     = "\${var.project_name}-rg"
  location = var.location

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 2. Virtual Network (VNet)
resource "azurerm_virtual_network" "vnet" {
  name                = "\${var.project_name}-vnet"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  address_space       = [var.vnet_cidr]

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 3. Subnet
resource "azurerm_subnet" "subnet" {
  name                 = "\${var.project_name}-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.subnet_cidr]
}

# 4. Network Security Group (NSG)
resource "azurerm_network_security_group" "nsg" {
  name                = "\${var.project_name}-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "Allow-SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = var.allowed_ssh_cidr
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

  security_rule {
    name                       = "Allow-HTTPS"
    priority                   = 1003
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 5. NSG Association at Subnet Level (Best Practice)
resource "azurerm_subnet_network_security_group_association" "subnet_nsg" {
  subnet_id                 = azurerm_subnet.subnet.id
  network_security_group_id = azurerm_network_security_group.nsg.id
}

# 6. Public IP Address
resource "azurerm_public_ip" "pip" {
  name                = "\${var.project_name}-pip"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = {
    Environment = var.environment
  }
}

# 7. Network Interface (NIC)
resource "azurerm_network_interface" "nic" {
  name                = "\${var.project_name}-nic"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip.id
  }

  tags = {
    Environment = var.environment
  }
}

# 8. Linux Virtual Machine (Ubuntu 22.04 LTS)
resource "azurerm_linux_virtual_machine" "vm" {
  name                            = "\${var.project_name}-vm"
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = azurerm_resource_group.rg.location
  size                            = var.vm_size
  admin_username                  = var.admin_username
  admin_password                  = var.admin_password
  disable_password_authentication = false
  network_interface_ids           = [azurerm_network_interface.nic.id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
    name                 = "\${var.project_name}-osdisk"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  custom_data = base64encode(<<-EOF
                #!/bin/bash
                apt-get update -y
                apt-get install -y nginx curl
                systemctl enable nginx
                systemctl start nginx
                echo "<h1>Azure VM Deployed via Enterprise Terraform Automation Center</h1>" > /var/www/html/index.html
                EOF
  )

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 9. Storage Account
resource "azurerm_storage_account" "storage" {
  name                     = lower("\${var.project_name}sa\${random_string.suffix.result}")
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 10. Blob Storage Container
resource "azurerm_storage_container" "app_data" {
  name                  = "appdata"
  storage_account_name  = azurerm_storage_account.storage.name
  container_access_type = "private"
}
`,
      },
      {
        name: 'variables.tf',
        content: `variable "location" {
  type        = string
  default     = "eastus"
  description = "Azure region where resources will be deployed"
}

variable "project_name" {
  type        = string
  default     = "azops-stack"
  description = "Project name prefix for Azure resource naming"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Target deployment environment (dev, test, staging, production)"
}

variable "vnet_cidr" {
  type        = string
  default     = "10.1.0.0/16"
  description = "Address space for the Virtual Network"
}

variable "subnet_cidr" {
  type        = string
  default     = "10.1.1.0/24"
  description = "Address prefix for the primary subnet"
}

variable "vm_size" {
  type        = string
  default     = "Standard_B1s"
  description = "Azure VM compute SKU size"
}

variable "admin_username" {
  type        = string
  default     = "azureuser"
  description = "Linux VM administrative user name"
}

variable "admin_password" {
  type        = string
  default     = "P@ssw0rd1234!"
  sensitive   = true
  description = "Password for admin user on the Linux VM"
}

variable "allowed_ssh_cidr" {
  type        = string
  default     = "0.0.0.0/0"
  description = "Source IP CIDR permitted for SSH port 22 access"
}
`,
      },
      {
        name: 'outputs.tf',
        content: `output "resource_group_name" {
  description = "Name of the created Azure Resource Group"
  value       = azurerm_resource_group.rg.name
}

output "vnet_name" {
  description = "Name of the Virtual Network"
  value       = azurerm_virtual_network.vnet.name
}

output "subnet_id" {
  description = "ID of the primary Subnet"
  value       = azurerm_subnet.subnet.id
}

output "public_ip_address" {
  description = "Static Public IP assigned to the Linux VM"
  value       = azurerm_public_ip.pip.ip_address
}

output "nic_id" {
  description = "ID of the Network Interface"
  value       = azurerm_network_interface.nic.id
}

output "linux_vm_id" {
  description = "ID of the Linux Virtual Machine"
  value       = azurerm_linux_virtual_machine.vm.id
}

output "linux_vm_private_ip" {
  description = "Private IP address of the Linux VM"
  value       = azurerm_linux_virtual_machine.vm.private_ip_address
}

output "storage_account_name" {
  description = "Name of the Azure Storage Account"
  value       = azurerm_storage_account.storage.name
}

output "storage_account_primary_blob_endpoint" {
  description = "Primary Blob Service endpoint URL"
  value       = azurerm_storage_account.storage.primary_blob_endpoint
}
`,
      },
    ],
  },

  // --- AWS TEMPLATES ---
  {
    id: 'aws-vpc-complete',
    name: 'AWS Production High-Availability VPC',
    provider: 'aws',
    category: 'Networking',
    description: 'Production Multi-AZ VPC with Public & Private Subnets, Internet Gateway, NAT Gateway, and Route Tables.',
    resources: ['aws_vpc', 'aws_subnet', 'aws_internet_gateway', 'aws_nat_gateway', 'aws_eip', 'aws_route_table', 'aws_route_table_association'],
    files: [
      {
        name: 'main.tf',
        content: `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Definition
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "\${var.project_name}-vpc"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "\${var.project_name}-igw"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = "\${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "\${var.project_name}-public-subnet"
    Tier = "Public"
  }
}

# Private Subnet
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr
  availability_zone = "\${var.aws_region}b"

  tags = {
    Name = "\${var.project_name}-private-subnet"
    Tier = "Private"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
}

# NAT Gateway
resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id

  tags = {
    Name = "\${var.project_name}-nat-gw"
  }
}

# Route Table for Public Subnet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "\${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}
`,
      },
      {
        name: 'variables.tf',
        content: `variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS deployment region"
}

variable "project_name" {
  type        = string
  default     = "prod-network"
  description = "Project name prefix"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Target environment"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "Primary VPC CIDR block"
}

variable "public_subnet_cidr" {
  type        = string
  default     = "10.0.1.0/24"
  description = "Public subnet CIDR"
}

variable "private_subnet_cidr" {
  type        = string
  default     = "10.0.2.0/24"
  description = "Private subnet CIDR"
}
`,
      },
      {
        name: 'outputs.tf',
        content: `output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the provisioned VPC"
}

output "public_subnet_id" {
  value       = aws_subnet.public.id
  description = "Public Subnet ID"
}

output "private_subnet_id" {
  value       = aws_subnet.private.id
  description = "Private Subnet ID"
}
`,
      },
    ],
  },
  {
    id: 'aws-ec2-complete',
    name: 'AWS Hardened EC2 with Security Group & EBS',
    provider: 'aws',
    category: 'Compute',
    description: 'Enterprise Ubuntu/Amazon Linux EC2 instance with Security Group firewall, EBS gp3 volume, and cloud-init.',
    resources: ['aws_instance', 'aws_security_group', 'aws_ebs_volume'],
    files: [
      {
        name: 'main.tf',
        content: `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Security Group
resource "aws_security_group" "server_sg" {
  name        = "\${var.instance_name}-sg"
  description = "Inbound SSH and HTTPS access"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "\${var.instance_name}-sg"
  }
}

# EC2 Instance
resource "aws_instance" "app_server" {
  ami           = var.ami_id
  instance_type = var.instance_type
  vpc_security_group_ids = [aws_security_group.server_sg.id]

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  tags = {
    Name        = var.instance_name
    Environment = var.environment
  }
}
`,
      },
      {
        name: 'variables.tf',
        content: `variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_name" {
  type    = string
  default = "production-app-node"
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}

variable "ami_id" {
  type        = string
  default     = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS us-east-1
  description = "Target AMI ID"
}

variable "allowed_ssh_cidr" {
  type    = string
  default = "0.0.0.0/0"
}

variable "root_volume_size" {
  type    = number
  default = 40
}

variable "environment" {
  type    = string
  default = "production"
}
`,
      },
      {
        name: 'outputs.tf',
        content: `output "instance_id" {
  value = aws_instance.app_server.id
}

output "public_ip" {
  value = aws_instance.app_server.public_ip
}
`,
      },
    ],
  },
  // --- AZURE TEMPLATES ---
  {
    id: 'azure-vnet-complete',
    name: 'Azure Enterprise Resource Group & VNet',
    provider: 'azure',
    category: 'Networking',
    description: 'Azure Resource Group with Virtual Network, Subnets, and Network Security Group (NSG) with security rules.',
    resources: ['azurerm_resource_group', 'azurerm_virtual_network', 'azurerm_subnet', 'azurerm_network_security_group'],
    files: [
      {
        name: 'main.tf',
        content: `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.azure_region

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_network_security_group" "nsg" {
  name                = "\${var.resource_group_name}-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_virtual_network" "vnet" {
  name                = "\${var.resource_group_name}-vnet"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = [var.vnet_cidr]

  tags = {
    Environment = var.environment
  }
}

resource "azurerm_subnet" "subnet" {
  name                 = "default-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.subnet_cidr]
}
`,
      },
      {
        name: 'variables.tf',
        content: `variable "azure_region" {
  type    = string
  default = "eastus"
}

variable "resource_group_name" {
  type    = string
  default = "rg-prod-enterprise"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "vnet_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "subnet_cidr" {
  type    = string
  default = "10.0.1.0/24"
}
`,
      },
      {
        name: 'outputs.tf',
        content: `output "resource_group_id" {
  value = azurerm_resource_group.rg.id
}

output "vnet_id" {
  value = azurerm_virtual_network.vnet.id
}
`,
      },
    ],
  },
  {
    id: 'azure-vm-complete',
    name: 'Azure Linux VM with Public IP & NIC',
    provider: 'azure',
    category: 'Compute',
    description: 'Azure Linux Virtual Machine (Standard_B2s / D2s_v5) with Public IP, NIC, Managed OS Disk, and SSH auth.',
    resources: ['azurerm_linux_virtual_machine', 'azurerm_public_ip', 'azurerm_network_interface'],
    files: [
      {
        name: 'main.tf',
        content: `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_public_ip" "pip" {
  name                = "\${var.vm_name}-pip"
  resource_group_name = var.resource_group_name
  location            = var.azure_region
  allocation_method   = "Dynamic"
}

resource "azurerm_network_interface" "nic" {
  name                = "\${var.vm_name}-nic"
  location            = var.azure_region
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip.id
  }
}

resource "azurerm_linux_virtual_machine" "vm" {
  name                = var.vm_name
  resource_group_name = var.resource_group_name
  location            = var.azure_region
  size                = var.vm_size
  admin_username      = var.admin_user

  network_interface_ids = [
    azurerm_network_interface.nic.id,
  ]

  admin_ssh_key {
    username   = var.admin_user
    public_key = file(var.ssh_public_key_path)
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

  tags = {
    Environment = var.environment
  }
}
`,
      },
      {
        name: 'variables.tf',
        content: `variable "azure_region" {
  type    = string
  default = "eastus"
}

variable "resource_group_name" {
  type    = string
  default = "rg-prod-enterprise"
}

variable "vm_name" {
  type    = string
  default = "vm-prod-app-01"
}

variable "vm_size" {
  type    = string
  default = "Standard_B2s"
}

variable "admin_user" {
  type    = string
  default = "azureuser"
}

variable "ssh_public_key_path" {
  type    = string
  default = "~/.ssh/id_rsa.pub"
}

variable "subnet_id" {
  type    = string
  default = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-prod-enterprise/providers/Microsoft.Network/virtualNetworks/rg-prod-enterprise-vnet/subnets/default-subnet"
}

variable "environment" {
  type    = string
  default = "production"
}
`,
      },
      {
        name: 'outputs.tf',
        content: `output "vm_id" {
  value = azurerm_linux_virtual_machine.vm.id
}
`,
      },
    ],
  },
];
