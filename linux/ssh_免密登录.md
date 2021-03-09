# ssh 免密登录

> [lzyprime 博客 (github)](https://lzyprime.github.io)  
> 更新时间：2020.6.19  
> qq及邮箱：2383518170  


## ssh 免密失败可能原因

### 1. 目录及文件权限不正确

- 家目录, .ssh: `750` 或 `700`, 不能77x
- rsa_id.pub, authorized_keys: 一般为`644`
- rsa_id: **必须** `600`

### 2. 对端sshd服务
- 检查对端机器`sshd`服务活着， `ps aux | grep sshd`
  - 若未启动，`service sshd start`
  - 若没有sshd只有ssh, 如ubuntu，一般是ssh server没安装。 `apt install openssh*`
- 检查sshd配置是否正确, `/etc/ssh/sshd_config`
  - Port
  - PubkeyAuthentication
  - PasswordAuthentication
  - 其他



## 配置过程

1. 生成

```bash
ssh-keygen
# 或者
ssh-keygen -t <类型(一般为rsa)> -C <描述>
```

2. copy

```bash
ssh-copy-id -i <公钥地址(~/.ssh/id_rsa.pub)>  <对端用户名>@<对端机器ip> -p <端口(默认22)>

# 样例
ssh-copy-id -i ~/.ssh/id_rsa.pub prime@192.168.10.100 -p 36000
```

3. 登录
```bash
ssh <对端用户名>@<对端机器ip> -p <端口(默认22)>
## 第一次需要密码
## 需要同意落key, 出现[yes/no]时，输入yes并回车
```
