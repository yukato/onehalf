#!/bin/bash
set -e

# ================================================
# RDS MySQL Setup Script for Bachelor Chatbot
# ================================================

# Configuration
AWS_REGION="ap-northeast-1"
AWS_ACCOUNT_ID="140493024080"

# RDS Configuration
DB_INSTANCE_ID="bachelor-chatbot-db"
DB_NAME="bd_agent"
DB_USERNAME="bdagent"
DB_PASSWORD="2iP0TT0S2wE8QDn"
DB_INSTANCE_CLASS="db.t3.micro"  # 開発用、本番は db.t3.small 以上推奨
DB_ENGINE="mysql"
DB_ENGINE_VERSION="8.0"
DB_STORAGE=20  # GB

# Network Configuration (existing VPC)
VPC_ID="vpc-e6f8de81"
ECS_SECURITY_GROUP="sg-0689344e12dc4f031"
SUBNET_IDS=("subnet-728c6659" "subnet-2f8c6f67" "subnet-0e0e5355")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}RDS MySQL Setup for Bachelor Chatbot${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Step 1: Create Security Group for RDS
echo -e "${YELLOW}Step 1: Creating RDS Security Group...${NC}"

RDS_SG_NAME="bachelor-chatbot-rds-sg"
RDS_SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${RDS_SG_NAME}" "Name=vpc-id,Values=${VPC_ID}" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "None")

if [ "$RDS_SG_ID" == "None" ] || [ -z "$RDS_SG_ID" ]; then
    echo "Creating new security group..."
    RDS_SG_ID=$(aws ec2 create-security-group \
        --group-name ${RDS_SG_NAME} \
        --description "Security group for Bachelor Chatbot RDS" \
        --vpc-id ${VPC_ID} \
        --query 'GroupId' \
        --output text \
        --region ${AWS_REGION})

    # Add inbound rule to allow MySQL from ECS
    aws ec2 authorize-security-group-ingress \
        --group-id ${RDS_SG_ID} \
        --protocol tcp \
        --port 3306 \
        --source-group ${ECS_SECURITY_GROUP} \
        --region ${AWS_REGION}

    echo -e "${GREEN}Created security group: ${RDS_SG_ID}${NC}"
else
    echo -e "${GREEN}Security group already exists: ${RDS_SG_ID}${NC}"
fi

# Step 2: Create DB Subnet Group
echo ""
echo -e "${YELLOW}Step 2: Creating DB Subnet Group...${NC}"

DB_SUBNET_GROUP="bachelor-chatbot-db-subnet-group"
SUBNET_GROUP_EXISTS=$(aws rds describe-db-subnet-groups \
    --db-subnet-group-name ${DB_SUBNET_GROUP} \
    --query 'DBSubnetGroups[0].DBSubnetGroupName' \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "None")

if [ "$SUBNET_GROUP_EXISTS" == "None" ]; then
    echo "Creating DB subnet group..."
    aws rds create-db-subnet-group \
        --db-subnet-group-name ${DB_SUBNET_GROUP} \
        --db-subnet-group-description "Subnet group for Bachelor Chatbot RDS" \
        --subnet-ids ${SUBNET_IDS[@]} \
        --region ${AWS_REGION}
    echo -e "${GREEN}Created DB subnet group: ${DB_SUBNET_GROUP}${NC}"
else
    echo -e "${GREEN}DB subnet group already exists: ${DB_SUBNET_GROUP}${NC}"
fi

# Step 3: Store credentials in Secrets Manager (placeholder, will update with endpoint later)
echo ""
echo -e "${YELLOW}Step 3: Creating Secrets Manager entries (will update DATABASE_URL after RDS creation)...${NC}"

# Create placeholder for database-url secret
SECRET_NAME="bachelor-chatbot/database-url"
SECRET_EXISTS=$(aws secretsmanager describe-secret \
    --secret-id ${SECRET_NAME} \
    --query 'Name' \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "None")

if [ "$SECRET_EXISTS" == "None" ]; then
    echo "Creating DATABASE_URL secret placeholder..."
    aws secretsmanager create-secret \
        --name ${SECRET_NAME} \
        --description "Database URL for Bachelor Chatbot" \
        --secret-string "placeholder" \
        --region ${AWS_REGION} > /dev/null
    echo -e "${GREEN}Created secret: ${SECRET_NAME}${NC}"
else
    echo -e "${GREEN}Secret already exists: ${SECRET_NAME}${NC}"
fi

# Step 4: Create RDS Instance
echo ""
echo -e "${YELLOW}Step 4: Creating RDS Instance...${NC}"

DB_EXISTS=$(aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --query 'DBInstances[0].DBInstanceIdentifier' \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "None")

if [ "$DB_EXISTS" == "None" ]; then
    echo "Creating RDS instance (this may take 5-10 minutes)..."
    aws rds create-db-instance \
        --db-instance-identifier ${DB_INSTANCE_ID} \
        --db-instance-class ${DB_INSTANCE_CLASS} \
        --engine ${DB_ENGINE} \
        --engine-version ${DB_ENGINE_VERSION} \
        --master-username ${DB_USERNAME} \
        --master-user-password ${DB_PASSWORD} \
        --db-name ${DB_NAME} \
        --allocated-storage ${DB_STORAGE} \
        --vpc-security-group-ids ${RDS_SG_ID} \
        --db-subnet-group-name ${DB_SUBNET_GROUP} \
        --backup-retention-period 7 \
        --no-publicly-accessible \
        --storage-type gp3 \
        --tags Key=Project,Value=bachelor-chatbot Key=Environment,Value=production \
        --region ${AWS_REGION}

    echo ""
    echo -e "${YELLOW}Waiting for RDS instance to become available...${NC}"
    aws rds wait db-instance-available \
        --db-instance-identifier ${DB_INSTANCE_ID} \
        --region ${AWS_REGION}

    echo -e "${GREEN}RDS instance created successfully!${NC}"
else
    echo -e "${GREEN}RDS instance already exists: ${DB_INSTANCE_ID}${NC}"
fi

# Step 5: Get RDS Endpoint
echo ""
echo -e "${YELLOW}Step 5: Getting RDS Endpoint...${NC}"

RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region ${AWS_REGION})

RDS_PORT=$(aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --query 'DBInstances[0].Endpoint.Port' \
    --output text \
    --region ${AWS_REGION})

# Step 6: Update DATABASE_URL secret with actual endpoint
echo ""
echo -e "${YELLOW}Step 6: Updating DATABASE_URL secret...${NC}"

DATABASE_URL="mysql://${DB_USERNAME}:${DB_PASSWORD}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}"
aws secretsmanager put-secret-value \
    --secret-id "bachelor-chatbot/database-url" \
    --secret-string "${DATABASE_URL}" \
    --region ${AWS_REGION}
echo -e "${GREEN}Updated DATABASE_URL secret${NC}"

# Step 7: Output Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}RDS Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "RDS Endpoint: ${YELLOW}${RDS_ENDPOINT}${NC}"
echo -e "RDS Port: ${YELLOW}${RDS_PORT}${NC}"
echo -e "Database Name: ${YELLOW}${DB_NAME}${NC}"
echo -e "Username: ${YELLOW}${DB_USERNAME}${NC}"
echo -e "Security Group: ${YELLOW}${RDS_SG_ID}${NC}"
echo ""
echo -e "DATABASE_URL for ECS:"
echo -e "${YELLOW}mysql://${DB_USERNAME}:${DB_PASSWORD}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Update ECS task definition to include DATABASE_URL"
echo "2. Run Prisma migrations against the RDS instance"
echo "3. Redeploy the application"
echo ""

# Save endpoint to file for other scripts
echo "${RDS_ENDPOINT}" > /tmp/rds-endpoint.txt
echo "RDS endpoint saved to /tmp/rds-endpoint.txt"
