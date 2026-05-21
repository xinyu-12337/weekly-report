#!/bin/bash
# ============================================
# 周报邮筒 - 一键部署脚本
# 适用于 Ubuntu 20.04 / 22.04
# 使用方法：bash deploy.sh
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 配置
APP_DIR="/opt/weekly-report"
DB_NAME="weekly_report"
DB_USER="weekly_report_user"
DB_PASS="WeeklyReport2026!"
SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

info "============================================"
info "  周报邮筒 - 一键部署"
info "============================================"
info ""

# ---- 第 1 步：检查系统 ----
info "第 1 步/8 步：检查系统环境..."
if ! command -v apt &> /dev/null; then
  error "此脚本仅支持 Ubuntu/Debian 系统，请使用 Ubuntu 20.04 或 22.04"
fi
info "系统检查通过"

# ---- 第 2 步：安装基础软件 ----
info "第 2 步/8 步：安装基础软件（Node.js、PostgreSQL、Nginx、Git）..."

# Node.js 18
if ! command -v node &> /dev/null; then
  info "安装 Node.js 18..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt install -y nodejs
fi
info "Node.js 版本：$(node -v)"

# pnpm
if ! command -v pnpm &> /dev/null; then
  info "安装 pnpm..."
  npm install -g pnpm
fi
info "pnpm 版本：$(pnpm -v)"

# PostgreSQL
if ! command -v psql &> /dev/null; then
  info "安装 PostgreSQL..."
  apt update
  apt install -y postgresql postgresql-contrib
fi
info "PostgreSQL 已安装"

# Nginx
if ! command -v nginx &> /dev/null; then
  info "安装 Nginx..."
  apt install -y nginx
fi
info "Nginx 已安装"

# Git
if ! command -v git &> /dev/null; then
  apt install -y git
fi
info "Git 已安装"

# build tools
apt install -y build-essential python3 2>/dev/null || true

# ---- 第 3 步：创建数据库 ----
info "第 3 步/8 步：配置 PostgreSQL 数据库..."

# 检查数据库是否已存在
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" != "1" ]; then
  sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF
  info "数据库创建完成"
else
  info "数据库已存在，跳过创建"
fi

# 确保 PostgreSQL 正在运行
systemctl start postgresql || true
systemctl enable postgresql || true

# ---- 第 4 步：下载代码 ----
info "第 4 步/8 步：下载项目代码..."

if [ -d "$APP_DIR/.git" ]; then
  info "项目目录已存在，拉取最新代码..."
  cd "$APP_DIR"
  git pull || warn "Git 拉取失败，使用现有代码"
else
  rm -rf "$APP_DIR"
  git clone https://github.com/xinyu-12337/weekly-report.git "$APP_DIR"
  cd "$APP_DIR"
fi

# ---- 第 5 步：安装依赖并构建 ----
info "第 5 步/8 步：安装项目依赖并构建（需要几分钟，请耐心等待）..."

cd "$APP_DIR"

# 安装依赖
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# 构建后端
info "构建后端服务..."
cd "$APP_DIR/server"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm build

# 构建前端
info "构建前端页面..."
cd "$APP_DIR"
PROJECT_DOMAIN="http://$SERVER_IP" pnpm build:web

# ---- 第 6 步：配置环境变量 ----
info "第 6 步/8 步：配置环境变量..."

ENV_FILE="$APP_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" << EOF
# 数据库连接
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME

# Supabase 兼容配置（本地部署使用 PostgreSQL 直连）
COZE_SUPABASE_URL=http://localhost:5432
COZE_SUPABASE_ANON_KEY=local-dev-key
COZE_SUPABASE_SERVICE_ROLE_KEY=local-dev-key

# 对象存储（需要单独配置，暂时留空）
COZE_BUCKET_ENDPOINT_URL=
COZE_BUCKET_NAME=

# 钉钉通知（必填，否则无法发送通知）
DINGTALK_WEBHOOK_URL=
DINGTALK_SECRET=

# 项目公网地址
PROJECT_DOMAIN=http://$SERVER_IP
EOF
  info "环境变量文件已创建：$ENV_FILE"
else
  info "环境变量文件已存在，跳过创建"
fi

# ---- 第 7 步：初始化数据库表 ----
info "第 7 步/8 步：初始化数据库表..."

cd "$APP_DIR/server"
export $(grep -v '^#' "$ENV_FILE" | xargs)
npx drizzle-kit push 2>/dev/null || {
  warn "drizzle-kit push 失败，尝试手动创建表..."
  # 手动创建表的 SQL
  sudo -u postgres psql -d "$DB_NAME" << 'SQL'
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  reject_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS weekly_report_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  manager_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS weekly_report_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL
  info "数据库表手动创建完成"
}

# ---- 第 8 步：配置系统服务和 Nginx ----
info "第 8 步/8 步：配置系统服务和 Nginx..."

# 创建 systemd 服务
cat > /etc/systemd/system/weekly-report.service << EOF
[Unit]
Description=Weekly Report Application
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=$APP_DIR/server
EnvironmentFile=$APP_DIR/.env
ExecStart=$(which node) dist/main.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable weekly-report
systemctl restart weekly-report

# 配置 Nginx
cat > /etc/nginx/sites-available/weekly-report << 'NGINX'
server {
    listen 80;
    server_name _;

    # 前端静态文件
    location / {
        root /opt/weekly-report/dist-web;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50m;
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/weekly-report /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# 等待服务启动
sleep 3

# ---- 完成 ----
echo ""
info "============================================"
info "  部署完成！"
info "============================================"
echo ""
info "访问地址：http://$SERVER_IP"
info ""
info "接下来你需要做的事："
info ""
info "1. 配置钉钉通知（必做）："
info "   编辑配置文件：nano $APP_DIR/.env"
info "   填写 DINGTALK_WEBHOOK_URL 和 DINGTALK_SECRET"
info "   保存后重启：systemctl restart weekly-report"
info ""
info "2. 开放服务器 80 端口（在云服务商控制台操作）"
info ""
info "3. 配置钉钉 H5 微应用："
info "   打开 https://open.dingtalk.com"
info "   创建 H5 微应用，首页地址填 http://$SERVER_IP"
info ""
info "常用命令："
info "   查看服务状态：systemctl status weekly-report"
info "   查看运行日志：journalctl -u weekly-report -f"
info "   重启服务：systemctl restart weekly-report"
info "   编辑配置：nano $APP_DIR/.env"
