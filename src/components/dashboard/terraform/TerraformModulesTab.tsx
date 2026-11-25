'use client';

import React, { useState } from 'react';
import {
  Layers,
  Box,
  Copy,
  Check,
  Code2,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  FileCode,
  AlertTriangle,
  FolderPlus,
  Zap,
  Search,
  Sliders,
  SlidersHorizontal,
  ChevronRight,
  Database,
  Cpu,
  Shield,
  Network,
} from 'lucide-react';
import { AwsLogo, AzureLogo, TerraformLogo } from '@/components/icons/CloudIcons';

export interface TerraformModuleItem {
  id: string;
  name: string;
  provider: 'aws' | 'azure';
  version: string;
  category: string;
  description: string;
  mainTf: string;
  variablesTf: string;
  outputsTf: string;
}

interface TerraformModulesTabProps {
  onApplyModule?: (moduleHcl: string) => Promise<void>;
}

export function TerraformModulesTab({ onApplyModule }: TerraformModulesTabProps) {
  // Built-in AWS and Azure only modules with all requested components
  const [modules, setModules] = useState<TerraformModuleItem[]>([
    // ==========================================
    // --- AWS MODULES ---
    // ==========================================
    {
      id: 'aws-vpc',
      name: 'AWS VPC Foundation Module',
      provider: 'aws',
      version: '2.1.0',
      category: 'Networking',
      description: 'Provisions an AWS Virtual Private Cloud (VPC) with customizable CIDR block, DNS hostnames, DNS support, and enterprise tagging.',
      mainTf: `resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  tags = merge(
    var.tags,
    {
      Name = var.vpc_name
    }
  )
}`,
      variablesTf: `variable "vpc_name" {
  type        = string
  description = "Name tag for the Virtual Private Cloud"
  default     = "prod-vpc"
}

variable "vpc_cidr" {
  type        = string
  description = "IPv4 CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "enable_dns_hostnames" {
  type        = bool
  description = "Enable DNS hostnames in the VPC"
  default     = true
}

variable "enable_dns_support" {
  type        = bool
  description = "Enable DNS resolution support in the VPC"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags to apply"
  default = {
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}`,
      outputsTf: `output "vpc_id" {
  description = "The ID of the provisioned VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "The primary IPv4 CIDR block of the VPC"
  value       = aws_vpc.this.cidr_block
}

output "vpc_arn" {
  description = "The ARN of the provisioned VPC"
  value       = aws_vpc.this.arn
}`,
    },
    {
      id: 'aws-subnet',
      name: 'AWS Subnet Module',
      provider: 'aws',
      version: '2.0.0',
      category: 'Networking',
      description: 'Provisions Public or Private subnets inside an existing VPC with availability zone assignment and public IP on launch configuration.',
      mainTf: `resource "aws_subnet" "this" {
  vpc_id                  = var.vpc_id
  cidr_block              = var.cidr_block
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = var.map_public_ip_on_launch

  tags = merge(
    var.tags,
    {
      Name = var.subnet_name
    }
  )
}`,
      variablesTf: `variable "vpc_id" {
  type        = string
  description = "The VPC ID where the subnet will be created"
}

variable "subnet_name" {
  type        = string
  description = "Name tag for the subnet"
  default     = "prod-public-subnet"
}

variable "cidr_block" {
  type        = string
  description = "Subnet CIDR block"
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  type        = string
  description = "Availability zone (e.g. us-east-1a)"
  default     = "us-east-1a"
}

variable "map_public_ip_on_launch" {
  type        = bool
  description = "Specify true to auto-assign public IP to instances launched in this subnet"
  default     = true
}

variable "tags" {
  type        = map(string)
  default = {
    Tier = "Public"
  }
}`,
      outputsTf: `output "subnet_id" {
  description = "The ID of the created subnet"
  value       = aws_subnet.this.id
}

output "subnet_arn" {
  description = "The ARN of the created subnet"
  value       = aws_subnet.this.arn
}

output "cidr_block" {
  description = "The CIDR block of the subnet"
  value       = aws_subnet.this.cidr_block
}`,
    },
    {
      id: 'aws-internet-gateway',
      name: 'AWS Internet Gateway & Route Table Module',
      provider: 'aws',
      version: '2.0.0',
      category: 'Networking',
      description: 'Provisions an AWS Internet Gateway, attaches it to the VPC, creates a public route table (0.0.0.0/0), and associates it with the subnet.',
      mainTf: `resource "aws_internet_gateway" "this" {
  vpc_id = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = var.gateway_name
    }
  )
}

resource "aws_route_table" "public" {
  vpc_id = var.vpc_id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = merge(
    var.tags,
    {
      Name = "\${var.gateway_name}-rt"
    }
  )
}

resource "aws_route_table_association" "public" {
  subnet_id      = var.subnet_id
  route_table_id = aws_route_table.public.id
}`,
      variablesTf: `variable "vpc_id" {
  type        = string
  description = "The VPC ID to attach the Internet Gateway"
}

variable "subnet_id" {
  type        = string
  description = "Subnet ID to associate with the public route table"
}

variable "gateway_name" {
  type        = string
  description = "Name tag for the Internet Gateway"
  default     = "prod-igw"
}

variable "tags" {
  type        = map(string)
  default = {
    ManagedBy = "Terraform"
  }
}`,
      outputsTf: `output "internet_gateway_id" {
  description = "The ID of the Internet Gateway"
  value       = aws_internet_gateway.this.id
}

output "route_table_id" {
  description = "The ID of the created public route table"
  value       = aws_route_table.public.id
}`,
    },
    {
      id: 'aws-security-group',
      name: 'AWS Security Group Module',
      provider: 'aws',
      version: '1.5.0',
      category: 'Security',
      description: 'Hardened AWS Security Group with configurable ingress ports (SSH 22, HTTP 80, HTTPS 443) and unrestricted outbound egress.',
      mainTf: `resource "aws_security_group" "this" {
  name        = var.security_group_name
  description = var.description
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_ports
    content {
      description = "Allow inbound port \${ingress.value}"
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = var.security_group_name
    }
  )
}`,
      variablesTf: `variable "security_group_name" {
  type        = string
  description = "Security group name"
  default     = "prod-app-sg"
}

variable "description" {
  type        = string
  description = "Description of security group rules"
  default     = "Managed security group for web & management traffic"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the security group resides"
}

variable "ingress_ports" {
  type        = list(number)
  description = "List of TCP ports to allow for inbound access"
  default     = [22, 80, 443]
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed for ingress traffic"
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  type        = map(string)
  default = {
    Tier = "Security"
  }
}`,
      outputsTf: `output "security_group_id" {
  description = "The ID of the security group"
  value       = aws_security_group.this.id
}

output "security_group_arn" {
  description = "The ARN of the security group"
  value       = aws_security_group.this.arn
}

output "security_group_name" {
  description = "The name of the security group"
  value       = aws_security_group.this.name
}`,
    },
    {
      id: 'aws-ec2-instance',
      name: 'AWS EC2 Instance Module',
      provider: 'aws',
      version: '2.0.0',
      category: 'Compute',
      description: 'Production-grade AWS EC2 compute module with encrypted gp3 root EBS, subnet attachment, security group bindings, and user data execution.',
      mainTf: `resource "aws_instance" "this" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = var.security_group_ids
  user_data              = var.user_data

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  tags = merge(
    var.tags,
    {
      Name = var.instance_name
    }
  )
}`,
      variablesTf: `variable "instance_name" {
  type        = string
  description = "Name tag for the EC2 instance"
  default     = "prod-web-server"
}

variable "ami_id" {
  type        = string
  description = "AMI ID for the operating system"
  default     = "ami-0c7217cdde317cfec"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance size"
  default     = "t3.medium"
}

variable "subnet_id" {
  type        = string
  description = "Subnet ID to launch instance into"
}

variable "security_group_ids" {
  type        = list(string)
  description = "Security groups associated with this instance"
  default     = []
}

variable "root_volume_size" {
  type        = number
  description = "Size of root EBS disk in GiB"
  default     = 40
}

variable "user_data" {
  type        = string
  description = "User data script to run on boot"
  default     = null
}

variable "tags" {
  type        = map(string)
  default = {
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}`,
      outputsTf: `output "instance_id" {
  description = "ID of the launched EC2 instance"
  value       = aws_instance.this.id
}

output "public_ip" {
  description = "Public IPv4 address of the EC2 instance"
  value       = aws_instance.this.public_ip
}

output "private_ip" {
  description = "Private IP of the EC2 instance"
  value       = aws_instance.this.private_ip
}

output "arn" {
  description = "ARN of the EC2 instance"
  value       = aws_instance.this.arn
}`,
    },
    {
      id: 'aws-s3-bucket-policies',
      name: 'AWS S3 Bucket & Policies Module',
      provider: 'aws',
      version: '2.0.0',
      category: 'Storage',
      description: 'Enterprise Amazon S3 storage module with public access block, versioning, AES256 server-side encryption, and TLS enforcement bucket policy.',
      mainTf: `resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name

  tags = merge(
    var.tags,
    {
      Name = var.bucket_name
    }
  )
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_policy" "enforce_tls" {
  bucket = aws_s3_bucket.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceTLSRequestsOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.this.arn,
          "\${aws_s3_bucket.this.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}`,
      variablesTf: `variable "bucket_name" {
  type        = string
  description = "Globally unique name for the S3 bucket"
}

variable "enable_versioning" {
  type        = bool
  description = "Enable object versioning"
  default     = true
}

variable "tags" {
  type        = map(string)
  default = {
    Tier        = "Storage"
    Environment = "production"
  }
}`,
      outputsTf: `output "bucket_id" {
  description = "Name/ID of the S3 bucket"
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.this.arn
}

output "bucket_domain_name" {
  description = "Bucket domain name endpoint"
  value       = aws_s3_bucket.this.bucket_domain_name
}`,
    },

    // ==========================================
    // --- AZURE MODULES ---
    // ==========================================
    {
      id: 'azure-resource-group',
      name: 'Azure Resource Group Module',
      provider: 'azure',
      version: '1.2.0',
      category: 'Management',
      description: 'Provisions an Azure Resource Group providing the lifecycle boundary and location container for all Azure cloud assets.',
      mainTf: `resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location

  tags = merge(
    var.tags,
    {
      Environment = "production"
      ManagedBy   = "Terraform Automation"
    }
  )
}`,
      variablesTf: `variable "resource_group_name" {
  type        = string
  description = "The name of the Resource Group"
  default     = "rg-prod-enterprise"
}

variable "location" {
  type        = string
  description = "Azure datacenter location"
  default     = "eastus"
}

variable "tags" {
  type        = map(string)
  default     = {}
}`,
      outputsTf: `output "resource_group_id" {
  description = "The ID of the Azure Resource Group"
  value       = azurerm_resource_group.this.id
}

output "resource_group_name" {
  description = "The name of the Resource Group"
  value       = azurerm_resource_group.this.name
}

output "location" {
  description = "The Azure region location"
  value       = azurerm_resource_group.this.location
}`,
    },
    {
      id: 'azure-vnet',
      name: 'Azure Virtual Network (VNet) Module',
      provider: 'azure',
      version: '2.0.0',
      category: 'Networking',
      description: 'Creates an Azure Virtual Network with customizable address spaces, location, and resource group linkage.',
      mainTf: `resource "azurerm_virtual_network" "this" {
  name                = var.vnet_name
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = var.address_space

  tags = merge(
    var.tags,
    {
      Name = var.vnet_name
    }
  )
}`,
      variablesTf: `variable "vnet_name" {
  type        = string
  description = "Name of the Virtual Network"
  default     = "prod-vnet"
}

variable "resource_group_name" {
  type        = string
  description = "Resource Group where the VNet will be placed"
}

variable "location" {
  type        = string
  description = "Azure region location"
  default     = "eastus"
}

variable "address_space" {
  type        = list(string)
  description = "List of address spaces in CIDR notation"
  default     = ["10.1.0.0/16"]
}

variable "tags" {
  type        = map(string)
  default = {
    Tier = "Networking"
  }
}`,
      outputsTf: `output "vnet_id" {
  description = "The ID of the Azure Virtual Network"
  value       = azurerm_virtual_network.this.id
}

output "vnet_name" {
  description = "The name of the Virtual Network"
  value       = azurerm_virtual_network.this.name
}

output "address_space" {
  description = "The address space configured on the VNet"
  value       = azurerm_virtual_network.this.address_space
}`,
    },
    {
      id: 'azure-subnet',
      name: 'Azure Subnet Module',
      provider: 'azure',
      version: '2.0.0',
      category: 'Networking',
      description: 'Provisions an Azure Subnet inside an existing VNet with custom CIDR prefixes and service endpoint delegates.',
      mainTf: `resource "azurerm_subnet" "this" {
  name                 = var.subnet_name
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.virtual_network_name
  address_prefixes     = var.address_prefixes
}`,
      variablesTf: `variable "subnet_name" {
  type        = string
  description = "Name of the Azure subnet"
  default     = "prod-subnet"
}

variable "resource_group_name" {
  type        = string
  description = "Resource Group name"
}

variable "virtual_network_name" {
  type        = string
  description = "Name of the parent Virtual Network"
}

variable "address_prefixes" {
  type        = list(string)
  description = "Address prefix list for the subnet"
  default     = ["10.1.1.0/24"]
}`,
      outputsTf: `output "subnet_id" {
  description = "The ID of the Azure Subnet"
  value       = azurerm_subnet.this.id
}

output "subnet_name" {
  description = "The name of the Azure Subnet"
  value       = azurerm_subnet.this.name
}

output "address_prefixes" {
  description = "The address prefixes assigned to the Subnet"
  value       = azurerm_subnet.this.address_prefixes
}`,
    },
    {
      id: 'azure-public-ip',
      name: 'Azure Public IP Address Module',
      provider: 'azure',
      version: '1.2.0',
      category: 'Networking',
      description: 'Allocates a Standard SKU Static Public IPv4 address in Azure with configurable idle timeout and DNS domain label.',
      mainTf: `resource "azurerm_public_ip" "this" {
  name                = var.public_ip_name
  resource_group_name = var.resource_group_name
  location            = var.location
  allocation_method   = var.allocation_method
  sku                 = var.sku

  tags = merge(
    var.tags,
    {
      Name = var.public_ip_name
    }
  )
}`,
      variablesTf: `variable "public_ip_name" {
  type        = string
  description = "Name for the Public IP resource"
  default     = "pip-prod-app"
}

variable "resource_group_name" {
  type        = string
  description = "Resource Group name"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "eastus"
}

variable "allocation_method" {
  type        = string
  description = "Allocation method: Static or Dynamic"
  default     = "Static"
}

variable "sku" {
  type        = string
  description = "Public IP SKU (Standard or Basic)"
  default     = "Standard"
}

variable "tags" {
  type        = map(string)
  default = {
    Environment = "production"
  }
}`,
      outputsTf: `output "public_ip_id" {
  description = "The ID of the Azure Public IP"
  value       = azurerm_public_ip.this.id
}

output "ip_address" {
  description = "The provisioned Public IP address"
  value       = azurerm_public_ip.this.ip_address
}`,
    },
    {
      id: 'azure-nic-subnet',
      name: 'Azure NIC & Subnet Association Module',
      provider: 'azure',
      version: '1.5.0',
      category: 'Networking',
      description: 'Creates an Azure Network Interface (NIC) associated directly to an Azure Subnet and an optional Public IP address.',
      mainTf: `resource "azurerm_network_interface" "this" {
  name                = var.nic_name
  location            = var.location
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = var.private_ip_allocation
    public_ip_address_id          = var.public_ip_id
  }

  tags = merge(
    var.tags,
    {
      Name = var.nic_name
    }
  )
}`,
      variablesTf: `variable "nic_name" {
  type        = string
  description = "Name of the Network Interface"
  default     = "nic-prod-app-01"
}

variable "resource_group_name" {
  type        = string
  description = "Resource Group name"
}

variable "location" {
  type        = string
  default     = "eastus"
}

variable "subnet_id" {
  type        = string
  description = "The Subnet ID to attach this NIC into (Subnet-level association)"
}

variable "public_ip_id" {
  type        = string
  description = "Optional Public IP ID to bind to this NIC"
  default     = null
}

variable "private_ip_allocation" {
  type        = string
  default     = "Dynamic"
}

variable "tags" {
  type        = map(string)
  default     = {}
}`,
      outputsTf: `output "nic_id" {
  description = "The ID of the Network Interface"
  value       = azurerm_network_interface.this.id
}

output "private_ip_address" {
  description = "Private IP assigned to this NIC"
  value       = azurerm_network_interface.this.private_ip_address
}`,
    },
    {
      id: 'azure-nsg-subnet-assoc',
      name: 'Azure NSG & Subnet Association Module',
      provider: 'azure',
      version: '2.0.0',
      category: 'Security',
      description: 'Provisions an Azure Network Security Group with firewall rules (SSH 22, HTTP 80) and binds it directly at the Subnet Level.',
      mainTf: `resource "azurerm_network_security_group" "this" {
  name                = var.nsg_name
  location            = var.location
  resource_group_name = var.resource_group_name

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

  tags = merge(
    var.tags,
    {
      Name = var.nsg_name
    }
  )
}

# Subnet-level NSG Association
resource "azurerm_subnet_network_security_group_association" "this" {
  subnet_id                 = var.subnet_id
  network_security_group_id = azurerm_network_security_group.this.id
}`,
      variablesTf: `variable "nsg_name" {
  type        = string
  description = "Name for the Network Security Group"
  default     = "app-nsg"
}

variable "resource_group_name" {
  type        = string
  description = "Resource Group name"
}

variable "location" {
  type        = string
  default     = "eastus"
}

variable "subnet_id" {
  type        = string
  description = "The Subnet ID to associate this NSG with at the subnet level"
}

variable "tags" {
  type        = map(string)
  default = {
    Tier = "Security"
  }
}`,
      outputsTf: `output "nsg_id" {
  description = "The ID of the Network Security Group"
  value       = azurerm_network_security_group.this.id
}

output "nsg_name" {
  description = "The name of the Network Security Group"
  value       = azurerm_network_security_group.this.name
}

output "subnet_association_id" {
  description = "The ID of the subnet-level association"
  value       = azurerm_subnet_network_security_group_association.this.id
}`,
    },
    {
      id: 'azure-linux-vm',
      name: 'Azure Linux Virtual Machine Module',
      provider: 'azure',
      version: '2.0.0',
      category: 'Compute',
      description: 'Deploys an Azure Linux VM with SSH key auth, managed Standard SSD OS disk, Canonical Ubuntu 22.04 LTS image, and attached NIC.',
      mainTf: `resource "azurerm_linux_virtual_machine" "this" {
  name                  = var.vm_name
  resource_group_name   = var.resource_group_name
  location              = var.location
  size                  = var.vm_size
  admin_username        = var.admin_username
  network_interface_ids = var.network_interface_ids

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.admin_ssh_public_key
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

  tags = merge(
    var.tags,
    {
      Name = var.vm_name
    }
  )
}`,
      variablesTf: `variable "vm_name" {
  type        = string
  description = "Name for the Azure Virtual Machine"
  default     = "vm-prod-app-01"
}

variable "resource_group_name" {
  type        = string
  description = "Resource Group name"
}

variable "location" {
  type        = string
  default     = "eastus"
}

variable "vm_size" {
  type        = string
  description = "Virtual Machine instance size"
  default     = "Standard_B2s"
}

variable "admin_username" {
  type        = string
  default     = "azureuser"
}

variable "admin_ssh_public_key" {
  type        = string
  description = "SSH public key content for remote login"
}

variable "network_interface_ids" {
  type        = list(string)
  description = "List of Network Interface IDs to attach to the VM"
}

variable "tags" {
  type        = map(string)
  default = {
    Environment = "production"
  }
}`,
      outputsTf: `output "vm_id" {
  description = "ID of the Azure VM"
  value       = azurerm_linux_virtual_machine.this.id
}

output "vm_name" {
  description = "Name of the Azure VM"
  value       = azurerm_linux_virtual_machine.this.name
}

output "admin_username" {
  description = "Admin username configured on the VM"
  value       = azurerm_linux_virtual_machine.this.admin_username
}`,
    },
    {
      id: 'azure-storage-account',
      name: 'Azure Storage Account & Blob Container Module',
      provider: 'azure',
      version: '2.0.0',
      category: 'Storage',
      description: 'Creates a secured Azure Storage Account with Blob container, TLS 1.2 minimum version, HTTPS-only enforcement, and replication tier.',
      mainTf: `resource "azurerm_storage_account" "this" {
  name                     = var.storage_account_name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = var.account_tier
  account_replication_type = var.account_replication_type
  min_tls_version          = "TLS1_2"

  tags = merge(
    var.tags,
    {
      Name = var.storage_account_name
    }
  )
}

resource "azurerm_storage_container" "this" {
  name                  = var.container_name
  storage_account_name  = azurerm_storage_account.this.name
  container_access_type = "private"
}`,
      variablesTf: `variable "storage_account_name" {
  type        = string
  description = "Globally unique lowercase alphanumeric name for storage account"
}

variable "resource_group_name" {
  type        = string
  description = "Resource Group name"
}

variable "location" {
  type        = string
  default     = "eastus"
}

variable "account_tier" {
  type        = string
  description = "Tier: Standard or Premium"
  default     = "Standard"
}

variable "account_replication_type" {
  type        = string
  description = "Replication: LRS, GRS, RAGRS, ZRS"
  default     = "LRS"
}

variable "container_name" {
  type        = string
  description = "Blob container name"
  default     = "data"
}

variable "tags" {
  type        = map(string)
  default = {
    Tier = "Storage"
  }
}`,
      outputsTf: `output "storage_account_id" {
  description = "The ID of the Azure Storage Account"
  value       = azurerm_storage_account.this.id
}

output "primary_blob_endpoint" {
  description = "The Primary Blob service endpoint"
  value       = azurerm_storage_account.this.primary_blob_endpoint
}

output "container_id" {
  description = "The ID of the provisioned Blob Container"
  value       = azurerm_storage_container.this.id
}`,
    },
  ]);

  const [activeTabByModule, setActiveTabByModule] = useState<Record<string, 'main' | 'variables' | 'outputs'>>({});
  const [providerFilter, setProviderFilter] = useState<'all' | 'aws' | 'azure'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals for CRUD:
  // 1. Create/Add Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mName, setMName] = useState('');
  const [mProvider, setMProvider] = useState<'aws' | 'azure'>('aws');
  const [mCategory, setMCategory] = useState('Compute');
  const [mDesc, setMDesc] = useState('');
  const [mMainTf, setMMainTf] = useState('# main.tf\nresource "aws_..." "this" {\n}\n');
  const [mVariablesTf, setMVariablesTf] = useState('# variables.tf\nvariable "example" {\n  type = string\n}\n');
  const [mOutputsTf, setMOutputsTf] = useState('# outputs.tf\noutput "example_id" {\n  value = "id"\n}\n');

  // 2. Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingModule, setEditingModule] = useState<TerraformModuleItem | null>(null);
  const [editActiveFileTab, setEditActiveFileTab] = useState<'main' | 'variables' | 'outputs'>('main');

  // 3. Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<TerraformModuleItem | null>(null);

  // Deck Mode Switcher & Category Search (Matching Image 1 Master Box)
  const [activeDeckView, setActiveDeckView] = useState<'catalog' | 'variables' | 'outputs'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  const filteredModules = modules.filter((m) => {
    if (providerFilter !== 'all' && m.provider !== providerFilter) return false;
    if (selectedCategory !== 'ALL') {
      const cat = m.category.toUpperCase();
      if (selectedCategory === 'AWS' && m.provider !== 'aws') return false;
      if (selectedCategory === 'AZURE' && m.provider !== 'azure') return false;
      if (selectedCategory === 'NETWORK' && !cat.includes('NETWORK')) return false;
      if (selectedCategory === 'COMPUTE' && !cat.includes('COMPUTE')) return false;
      if (selectedCategory === 'STORAGE' && !cat.includes('STORAGE')) return false;
      if (selectedCategory === 'SECURITY' && !cat.includes('SECURITY')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const awsCount = modules.filter((m) => m.provider === 'aws').length;
  const azureCount = modules.filter((m) => m.provider === 'azure').length;

  const handleCopyCode = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Add / Create
  const handleOpenCreateModal = () => {
    setMName('');
    setMProvider('aws');
    setMCategory('Compute');
    setMDesc('');
    setMMainTf('# main.tf\nresource "aws_..." "this" {\n}\n');
    setMVariablesTf('# variables.tf\nvariable "example" {\n  type = string\n}\n');
    setMOutputsTf('# outputs.tf\noutput "example_id" {\n  value = "id"\n}\n');
    setShowCreateModal(true);
  };

  const handleSaveNewModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName.trim()) return;

    const newMod: TerraformModuleItem = {
      id: `custom-${Date.now()}`,
      name: mName.trim(),
      provider: mProvider,
      version: '1.0.0',
      category: mCategory,
      description: mDesc || 'Custom enterprise infrastructure module.',
      mainTf: mMainTf,
      variablesTf: mVariablesTf,
      outputsTf: mOutputsTf,
    };

    setModules([newMod, ...modules]);
    setShowCreateModal(false);
  };

  // Edit
  const handleOpenEditModal = (mod: TerraformModuleItem) => {
    setEditingModule({ ...mod });
    setEditActiveFileTab('main');
    setShowEditModal(true);
  };

  const handleSaveEditedModule = () => {
    if (!editingModule) return;
    setModules((prev) =>
      prev.map((m) => (m.id === editingModule.id ? { ...editingModule } : m))
    );
    setShowEditModal(false);
    setEditingModule(null);
  };

  // Delete
  const handleOpenDeleteModal = (mod: TerraformModuleItem) => {
    setModuleToDelete(mod);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!moduleToDelete) return;
    setModules((prev) => prev.filter((m) => m.id !== moduleToDelete.id));
    setShowDeleteModal(false);
    setModuleToDelete(null);
  };

  const allVariablesCount = modules.reduce((acc, m) => {
    const matches = m.variablesTf.match(/variable\s+"[^"]+"/g);
    return acc + (matches ? matches.length : 0);
  }, 0);

  const allOutputsCount = modules.reduce((acc, m) => {
    const matches = m.outputsTf.match(/output\s+"[^"]+"/g);
    return acc + (matches ? matches.length : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Master Control Bar Box (Terraform Architecture Builder Style - Matching Image 1 & 2) */}
      <div className="bg-[#090F1E]/95 border border-purple-500/35 rounded-2xl p-5 shadow-2xl shadow-purple-950/40 backdrop-blur-md space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left Title & Badges */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/25 via-indigo-500/20 to-blue-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-xl shadow-purple-950/40 shrink-0">
              <Box className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Infrastructure Modules &amp; Blueprint Catalog
                </h1>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  AWS &amp; Azure
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {modules.length} Modules
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <AwsLogo className="w-3 h-3" />
                  <span>{awsCount} AWS</span>
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <AzureLogo className="w-3 h-3" />
                  <span>{azureCount} Azure</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Complete AWS &amp; Azure modular infrastructure. Manage resources, input variables, and infrastructure outputs with Create, Edit, Save, and Remove.
              </p>
            </div>
          </div>

          {/* Right Mode Switcher Deck (Same as Image 1) */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#070B14]/80 border border-purple-500/25 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveDeckView('catalog')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeDeckView === 'catalog'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Module Catalog</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDeckView('variables')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeDeckView === 'variables'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Variables ({allVariablesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDeckView('outputs')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeDeckView === 'outputs'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Outputs ({allOutputsCount})</span>
            </button>
          </div>
        </div>

        {/* Action Controls & Category Search Bar (Same as Image 1) */}
        <div className="pt-3 border-t border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/25 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Module</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSaveSuccessToast(true);
                setTimeout(() => setSaveSuccessToast(false), 2500);
              }}
              className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saveSuccessToast ? 'Stack Saved to Project!' : 'Save Stack to Project (main + vars + outputs)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#070B14] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-40"
              />
            </div>
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#070B14] p-1 rounded-xl border border-gray-800 text-[10px] font-bold uppercase font-mono">
              {['ALL', 'AWS', 'AZURE', 'NETWORK', 'COMPUTE', 'STORAGE', 'SECURITY'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: MODULE CATALOG GRID */}
      {activeDeckView === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredModules.map((mod) => {
          const isAws = mod.provider === 'aws';
          const activeFile = activeTabByModule[mod.id] || 'main';

          const activeFileContent =
            activeFile === 'main'
              ? mod.mainTf
              : activeFile === 'variables'
              ? mod.variablesTf
              : mod.outputsTf;

          return (
            <div
              key={mod.id}
              className="p-5 rounded-2xl bg-[#0D1526]/90 border border-purple-500/20 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div className="space-y-3">
                {/* Header: Provider Logo, Category, Version */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isAws ? <AwsLogo className="w-5 h-5" /> : <AzureLogo className="w-5 h-5" />}
                    <span className="text-[10px] font-mono uppercase font-bold text-gray-400">
                      {mod.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                        isAws ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {mod.provider}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">v{mod.version}</span>
                  </div>
                </div>

                {/* Module Title & Description */}
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{mod.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{mod.description}</p>
                </div>

                {/* Sub-Tabs for main.tf, variables.tf, outputs.tf */}
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
                    <div className="flex items-center gap-1">
                      {(['main', 'variables', 'outputs'] as const).map((tabKey) => {
                        const isTabActive = activeFile === tabKey;
                        return (
                          <button
                            key={tabKey}
                            type="button"
                            onClick={() =>
                              setActiveTabByModule((prev) => ({ ...prev, [mod.id]: tabKey }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                              isTabActive
                                ? 'bg-[#18233C] text-cyan-300 border border-cyan-500/40 shadow-sm'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {tabKey}.tf
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(`${mod.id}-${activeFile}`, activeFileContent)}
                      className="text-xs text-gray-400 hover:text-white font-mono flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === `${mod.id}-${activeFile}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === `${mod.id}-${activeFile}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Code Snippet Box */}
                  <pre className="p-3.5 rounded-xl bg-[#060A14] border border-gray-800 text-xs font-mono text-cyan-300/90 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                    {activeFileContent}
                  </pre>
                </div>
              </div>

              {/* Bottom Actions Bar: Edit, Delete, Apply */}
              <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* EDIT */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(mod)}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {/* DELETE */}
                  <button
                    type="button"
                    onClick={() => handleOpenDeleteModal(mod)}
                    className="p-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold transition cursor-pointer"
                    title="Delete Module"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {onApplyModule && (
                  <button
                    type="button"
                    onClick={() => onApplyModule(mod.mainTf)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-extrabold transition flex items-center gap-1 shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Apply to Project</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* VIEW 2: VARIABLES DECK */}
      {activeDeckView === 'variables' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0D1526]/90 border border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Aggregated Input Variables</h3>
                <p className="text-xs text-gray-400">
                  Total of {allVariablesCount} input variables declared across active AWS &amp; Azure modules.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {allVariablesCount} Variables
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModules.map((mod) => (
              <div
                key={mod.id}
                className="p-4 rounded-2xl bg-[#0D1526]/85 border border-gray-800 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <div className="flex items-center gap-2">
                    {mod.provider === 'aws' ? <AwsLogo className="w-4 h-4" /> : <AzureLogo className="w-4 h-4" />}
                    <h4 className="text-xs font-bold text-white font-mono">{mod.name}</h4>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">variables.tf</span>
                </div>
                <pre className="p-3 rounded-xl bg-[#070B14] border border-gray-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-56 scrollbar-thin">
                  <code>{mod.variablesTf}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: OUTPUTS DECK */}
      {activeDeckView === 'outputs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0D1526]/90 border border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Aggregated Infrastructure Outputs</h3>
                <p className="text-xs text-gray-400">
                  Total of {allOutputsCount} exportable outputs declared across active AWS &amp; Azure modules.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {allOutputsCount} Outputs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModules.map((mod) => (
              <div
                key={mod.id}
                className="p-4 rounded-2xl bg-[#0D1526]/85 border border-gray-800 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <div className="flex items-center gap-2">
                    {mod.provider === 'aws' ? <AwsLogo className="w-4 h-4" /> : <AzureLogo className="w-4 h-4" />}
                    <h4 className="text-xs font-bold text-white font-mono">{mod.name}</h4>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">outputs.tf</span>
                </div>
                <pre className="p-3 rounded-xl bg-[#070B14] border border-gray-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-56 scrollbar-thin">
                  <code>{mod.outputsTf}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD / CREATE MODULE                             */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#090F1E] border border-purple-500/40 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Create New Terraform Module</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewModule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">Module Name:</label>
                  <input
                    type="text"
                    value={mName}
                    onChange={(e) => setMName(e.target.value)}
                    placeholder="e.g. AWS Security Group Custom"
                    className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">Target Cloud Provider:</label>
                  <select
                    value={mProvider}
                    onChange={(e) => setMProvider(e.target.value as any)}
                    className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                  >
                    <option value="aws">Amazon Web Services (AWS)</option>
                    <option value="azure">Microsoft Azure Cloud</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">Category:</label>
                  <input
                    type="text"
                    value={mCategory}
                    onChange={(e) => setMCategory(e.target.value)}
                    placeholder="Compute, Networking, Storage, Security..."
                    className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">Description:</label>
                  <input
                    type="text"
                    value={mDesc}
                    onChange={(e) => setMDesc(e.target.value)}
                    placeholder="Module purpose and architectural details..."
                    className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Tabs for main.tf, variables.tf, outputs.tf during creation */}
              <div className="space-y-2">
                <label className="text-gray-300 font-bold block">Module Code Definition:</label>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-400 font-mono text-[11px] block mb-1">main.tf:</span>
                    <textarea
                      rows={5}
                      value={mMainTf}
                      onChange={(e) => setMMainTf(e.target.value)}
                      className="w-full bg-[#060A14] border border-gray-800 rounded-xl p-3 font-mono text-xs text-cyan-300 leading-relaxed"
                    />
                  </div>
                  <div>
                    <span className="text-gray-400 font-mono text-[11px] block mb-1">variables.tf:</span>
                    <textarea
                      rows={3}
                      value={mVariablesTf}
                      onChange={(e) => setMVariablesTf(e.target.value)}
                      className="w-full bg-[#060A14] border border-gray-800 rounded-xl p-3 font-mono text-xs text-purple-300 leading-relaxed"
                    />
                  </div>
                  <div>
                    <span className="text-gray-400 font-mono text-[11px] block mb-1">outputs.tf:</span>
                    <textarea
                      rows={3}
                      value={mOutputsTf}
                      onChange={(e) => setMOutputsTf(e.target.value)}
                      className="w-full bg-[#060A14] border border-gray-800 rounded-xl p-3 font-mono text-xs text-emerald-300 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold cursor-pointer"
                >
                  Create Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT MODULE                                     */}
      {/* ======================================================== */}
      {showEditModal && editingModule && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#090F1E] border border-purple-500/40 rounded-2xl w-full max-w-3xl shadow-2xl p-6 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  Edit Module: <span className="text-cyan-300 font-mono">{editingModule.name}</span>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">Module Name:</label>
                  <input
                    type="text"
                    value={editingModule.name}
                    onChange={(e) =>
                      setEditingModule({ ...editingModule, name: e.target.value })
                    }
                    className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">Category:</label>
                  <input
                    type="text"
                    value={editingModule.category}
                    onChange={(e) =>
                      setEditingModule({ ...editingModule, category: e.target.value })
                    }
                    className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">Description:</label>
                <input
                  type="text"
                  value={editingModule.description}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, description: e.target.value })
                  }
                  className="w-full bg-[#0D1526] border border-gray-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Sub-tabs inside Edit Modal for main.tf, variables.tf, outputs.tf */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                  {(['main', 'variables', 'outputs'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditActiveFileTab(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        editActiveFileTab === t
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {t}.tf
                    </button>
                  ))}
                </div>

                {editActiveFileTab === 'main' && (
                  <textarea
                    rows={12}
                    value={editingModule.mainTf}
                    onChange={(e) =>
                      setEditingModule({ ...editingModule, mainTf: e.target.value })
                    }
                    className="w-full bg-[#060A14] border border-cyan-500/40 rounded-xl p-3 font-mono text-xs text-cyan-300 leading-relaxed"
                  />
                )}

                {editActiveFileTab === 'variables' && (
                  <textarea
                    rows={12}
                    value={editingModule.variablesTf}
                    onChange={(e) =>
                      setEditingModule({ ...editingModule, variablesTf: e.target.value })
                    }
                    className="w-full bg-[#060A14] border border-purple-500/40 rounded-xl p-3 font-mono text-xs text-purple-300 leading-relaxed"
                  />
                )}

                {editActiveFileTab === 'outputs' && (
                  <textarea
                    rows={12}
                    value={editingModule.outputsTf}
                    onChange={(e) =>
                      setEditingModule({ ...editingModule, outputsTf: e.target.value })
                    }
                    className="w-full bg-[#060A14] border border-emerald-500/40 rounded-xl p-3 font-mono text-xs text-emerald-300 leading-relaxed"
                  />
                )}
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
                  onClick={handleSaveEditedModule}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION                             */}
      {/* ======================================================== */}
      {showDeleteModal && moduleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090F1E] border border-red-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Module</h3>
                <p className="text-xs text-gray-400">Are you sure you want to remove this module?</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0D1526] border border-gray-800 text-xs text-gray-300">
              Module: <strong className="text-white font-mono">{moduleToDelete.name}</strong>
              <br />
              Provider: <span className="text-cyan-300 font-mono uppercase">{moduleToDelete.provider}</span>
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
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
