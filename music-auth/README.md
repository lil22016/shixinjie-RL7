# 拾心界：网易云扫码登录

此目录是独立的 HTTPS 音乐服务，供 GitHub Pages 上的「一起听歌」使用。登录 Cookie 只存在服务端内存中；浏览器仅保存随机会话令牌。服务重启后需要重新扫码。此实现调用第三方维护的 `ncm-api-rs`，不是网易云官方开放授权，接口可能变化。

## 上线步骤（Render 示例）

1. 将本次修改的 `index.html`、`js/listen-together.js`、整个 `music-auth` 目录上传到 `lil22016/shixinjie-RL7`，保留目录路径。先不要扫码。
2. 在 Render 创建 **New → Web Service**，连接这个 GitHub 仓库；选择 **Docker**。Dockerfile Path 填 `music-auth/Dockerfile`，Docker Build Context 填 `.`。首次 Rust 构建可能较久，服务需要保持运行。
3. 在 Render 的 Environment 中添加 `SITE_ORIGIN=https://lil22016.github.io`。不要在 GitHub 提交网易云密码或 Cookie。Render 会给服务一个 `https://...onrender.com` 地址。
4. 在 `js/listen-together.js` 开头，把 `AUTH_SERVICE: 'https://YOUR-MUSIC-SERVICE.example.com'` 改为上一步的 HTTPS 地址，**不要在末尾加 `/`**，提交到 GitHub。这个地址是公开的服务地址，不是秘密。
5. 等 GitHub Pages 更新后，打开网站聊天框的 `+` → **一起听歌** → **扫码登录网易云**。用网易云音乐 App 扫码并在 App 中确认。若网站与扫码 App 在同一台手机上，可先截图二维码，再尝试网易云的「相册识别」扫码功能；是否支持由 App 版本决定，也可用另一台设备显示二维码。
6. 登录成功后，「我的歌单」会出现账号歌单。点歌单加载曲目，点歌播放；账号有播放权限的 VIP 曲目会请求登录态播放地址。如果服务返回空地址，界面会显示无法播放。

`https://YOUR-MUSIC-SERVICE.example.com` 未替换前，原有公开歌单功能继续可用，不显示扫码入口。

## 注意

- Docker 服务必须有公网 HTTPS。GitHub Pages 本身不能运行这个后端。部署平台若休眠、重启或重建，内存中的登录会话会失效，需要重新扫码。
- 此方案不会绕开会员权限；VIP 需你的网易云账号本身有相应权限，也受歌曲地区、版权和网易云接口限制。
- 本服务只允许 `SITE_ORIGIN` 浏览器来源。不要把音乐服务的端口直接当作通用公开 API 使用；端点只有扫码、个人歌单和播放地址等有限功能。
- 「退出」会清除当前浏览器的服务端登录会话与本地账号歌单列表。
