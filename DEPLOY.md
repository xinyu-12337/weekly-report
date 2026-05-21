# 周报邮筒 - 部署指南

本文档帮助你将「周报邮筒」应用部署到服务器上，部署完成后可以通过浏览器或钉钉访问。

---

## 一、你需要准备的东西

| 项目 | 说明 |
|------|------|
| 一台云服务器 | 阿里云/腾讯云/华为云均可，推荐 2核4G 配置 |
| 操作系统 | Ubuntu 20.04 或 22.04（最常用，照着操作就行） |
| 域名（可选） | 如果没有域名，可以用服务器 IP 地址访问 |

---

## 二、服务器购买指引（没有服务器的看这里）

### 阿里云（推荐）
1. 打开 https://www.aliyun.com 注册并登录
2. 搜索「轻量应用服务器」
3. 选择配置：2核2G 即可，系统选 **Ubuntu 22.04**
4. 新用户通常有免费试用或低价优惠
5. 购买完成后，记住服务器的 **公网 IP 地址**（类似 `47.100.xxx.xxx`）

### 腾讯云
1. 打开 https://cloud.tencent.com 注册并登录
2. 搜索「轻量应用服务器」
3. 同样选 2核2G，系统选 **Ubuntu 22.04**

---

## 三、连接到服务器

### Windows 用户
1. 下载 **PuTTY**：https://www.putty.org/ ，安装并打开
2. Host Name 填你的服务器 **公网 IP**
3. Port 填 **22**
4. 点击 **Open**
5. login as 输入 **root**
6. 输入服务器密码（购买时设置的）

### Mac 用户
1. 打开「终端」应用
2. 输入 `ssh root@你的服务器IP` 回车
3. 输入密码回车

---

## 四、一键部署

连接到服务器后，复制以下整段命令，粘贴到终端按回车：

```bash
curl -fsSL https://raw.githubusercontent.com/xinyu-12337/weekly-report/main/deploy.sh -o deploy.sh && chmod +x deploy.sh && bash deploy.sh
```

> 如果上面的命令无法执行（GitHub 访问不了），请看下方「手动部署」章节。

脚本会自动完成：
- 安装 Node.js、pnpm、PostgreSQL、Nginx
- 下载项目代码并构建
- 配置数据库和自动启动
- 配置 Nginx 反向代理

---

## 五、配置环境变量

部署脚本执行完成后，需要配置以下环境变量：

```bash
nano /opt/weekly-report/.env
```

在打开的编辑器中填写以下内容：

```env
# === 必填项 ===

# 钉钉群机器人 Webhook 地址（创建机器人后获得）
DINGTALK_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=你的token

# 钉钉机器人加签密钥（创建机器人时获得，SEC 开头）
DINGTALK_SECRET=SEC你的密钥

# 项目公网访问地址（你的服务器IP或域名）
# 如果没有域名，用 http://你的服务器IP
PROJECT_DOMAIN=http://你的服务器IP

# === 以下由部署脚本自动生成，一般不需要修改 ===
# COZE_SUPABASE_URL=（自动生成）
# COZE_SUPABASE_ANON_KEY=（自动生成）
# COZE_SUPABASE_SERVICE_ROLE_KEY=（自动生成）
# DATABASE_URL=（自动生成）
```

填写完成后：
1. 按 `Ctrl + O` 保存（字母 O，不是数字 0）
2. 按 `Enter` 确认
3. 按 `Ctrl + X` 退出

然后重启服务：

```bash
systemctl restart weekly-report
```

---

## 六、验证部署是否成功

### 1. 检查服务状态
```bash
systemctl status weekly-report
```
看到 **active (running)** 就是成功了。

### 2. 浏览器访问
打开浏览器，地址栏输入 `http://你的服务器IP`，能看到周报提交页面即成功。

### 3. 测试提交
在页面上填写一个周报并提交，如果能正常提交（或被红线退回），说明一切正常。

---

## 七、配置钉钉 H5 微应用

1. 打开 https://open.dingtalk.com 并用钉钉扫码登录
2. 点击「应用开发」→「创建应用」
3. 应用类型选 **H5 微应用**
4. 应用名称填 **周报邮筒**
5. 应用首页地址填 **http://你的服务器IP**（有域名则填域名）
6. 在「安全与权限」中配置 HTTP 域名白名单，添加你的服务器 IP 或域名
7. 设置可见范围（选谁能在钉钉里看到这个应用）
8. 发布应用

---

## 八、创建钉钉群机器人

1. 打开钉钉，进入你要接收通知的群
2. 点击群设置（右上角 ⋯）→「智能群助手」→「添加机器人」
3. 选择「自定义」机器人
4. 机器人名称填 **周报通知**
5. 安全设置选 **加签**，复制生成的 **SEC 开头的密钥**
6. 点击完成，复制生成的 **Webhook 地址**
7. 把这两个值填到第五步的 `.env` 文件中
8. 重启服务：`systemctl restart weekly-report`

---

## 九、日常运维命令

```bash
# 查看服务状态
systemctl status weekly-report

# 重启服务
systemctl restart weekly-report

# 查看运行日志
journalctl -u weekly-report -f

# 更新代码并重新部署
cd /opt/weekly-report && git pull && pnpm install && pnpm build:server && pnpm build:web && systemctl restart weekly-report
```

---

## 手动部署（如果一键脚本无法执行）

如果 GitHub 访问不了，按以下步骤手动操作：

### 第 1 步：安装基础软件

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 PostgreSQL
apt install -y postgresql postgresql-contrib

# 安装 Nginx
apt install -y nginx

# 安装 Git
apt install -y git
```

### 第 2 步：创建数据库

```bash
sudo -u postgres psql << EOF
CREATE DATABASE weekly_report;
CREATE USER weekly_report_user WITH PASSWORD 'WeeklyReport2026!';
GRANT ALL PRIVILEGES ON DATABASE weekly_report TO weekly_report_user;
ALTER DATABASE weekly_report OWNER TO weekly_report_user;
EOF
```

### 第 3 步：下载代码

```bash
mkdir -p /opt/weekly-report
cd /opt/weekly-report

# 如果 GitHub 能访问
git clone https://github.com/xinyu-12337/weekly-report.git .

# 如果 GitHub 访问不了，从你自己的电脑上传代码
# 先在本地打包：在项目目录执行 tar czf weekly-report.tar.gz .
# 然后用 scp 上传：scp weekly-report.tar.gz root@服务器IP:/opt/weekly-report/
# 再在服务器上解压：cd /opt/weekly-report && tar xzf weekly-report.tar.gz
```

### 第 4 步：安装依赖并构建

```bash
cd /opt/weekly-report
pnpm install
pnpm build:server
pnpm build:web
```

### 第 5 步：配置环境变量

```bash
cat > /opt/weekly-report/.env << 'EOF'
DATABASE_URL=postgresql://weekly_report_user:WeeklyReport2026!@localhost:5432/weekly_report
COZE_SUPABASE_URL=http://localhost:5432
COZE_SUPABASE_ANON_KEY=local-dev-key
COZE_SUPABASE_SERVICE_ROLE_KEY=local-dev-key
COZE_BUCKET_ENDPOINT_URL=http://localhost:9000
COZE_BUCKET_NAME=weekly-report
DINGTALK_WEBHOOK_URL=
DINGTALK_SECRET=
PROJECT_DOMAIN=http://你的服务器IP
EOF
```

### 第 6 步：初始化数据库表

```bash
cd /opt/weekly-report/server
npx drizzle-kit push
```

### 第 7 步：创建系统服务

```bash
cat > /etc/systemd/system/weekly-report.service << 'EOF'
[Unit]
Description=Weekly Report Application
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/weekly-report/server
EnvironmentFile=/opt/weekly-report/.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable weekly-report
systemctl start weekly-report
```

### 第 8 步：配置 Nginx

```bash
cat > /etc/nginx/sites-available/weekly-report << 'EOF'
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
EOF

rm -f /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/weekly-report /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### 第 9 步：验证

浏览器打开 `http://你的服务器IP`，看到周报提交页面即成功。

---

## 常见问题

### Q: 浏览器打开显示无法访问？
1. 检查服务器安全组是否开放了 80 端口（HTTP）
2. 检查服务是否在运行：`systemctl status weekly-report`
3. 检查 Nginx 是否在运行：`systemctl status nginx`

### Q: 提交周报后钉钉没收到通知？
1. 检查 `.env` 中 `DINGTALK_WEBHOOK_URL` 和 `DINGTALK_SECRET` 是否填写正确
2. 查看日志：`journalctl -u weekly-report -f`，搜索 DingTalk 相关信息

### Q: 红线检测不生效？
- 红线检测依赖 LLM 服务，当前使用的是沙箱环境内置的 LLM。部署到独立服务器后，需要确认 `coze-coding-dev-sdk` 的 API 能正常调用

### Q: 附件上传失败？
- 检查 `.env` 中 `COZE_BUCKET_ENDPOINT_URL` 和 `COZE_BUCKET_NAME` 是否配置正确
- 对象存储服务需要单独配置，可联系 IT 管理员协助
