# Part04-集成WebSocket-tio实现网络群聊-聊天室

```text
blog
│  pom.xml
│
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          ├─config
│      │          │      ImServerConfig.java  # 执行入口类
│      │          │
│      │          ├─controller
│      │          │      BaseController.java
│      │          │      ChatController.java
│      │          │
│      │          ├─service
│      │          │  │  ChatService.java
│      │          │  │
│      │          │  └─impl
│      │          │          ChatServiceImpl.java
│      │          │
│      │          ├─utils
│      │          │      SpringUtil.java
│      │          │
│      │          └─im
│      │             ├─handler  # 处理【接受字符类型消息：Chat类型、Ping类型】
│      │             │  │  MsgHandler.java
│      │             │  │  MsgHandlerFactory.java
│      │             │  │
│      │             │  ├─filter
│      │             │  │      ExculdeMineChannelContextFilter.java
│      │             │  │
│      │             │  └─impl
│      │             │          ChatMsgHandler.java
│      │             │          PingMsgHandler.java
│      │             │
│      │             ├─message
│      │             │      ChatImMess.java
│      │             │      ChatOutMess.java
│      │             │
│      │             ├─server
│      │             │      ImServerStarter.java  # 1.启动tio服务（绑定端口），并调用-消息处理器
│      │             │      ImWsMsgHandler.java   # 2.判断-消息处理器-类别【接受字符类型消息：Chat类型、Ping类型
│      │             │
│      │             └─vo
│      │                     ImMess.java
│      │                     ImTo.java
│      │                     ImUser.java
│      │
│      └─resources
│          │  application.yml
│          │
│          ├─static
│          │  └─res
│          │      ├─js  # 自己编写 js 文件
│          │      │      chat.js
│          │      │      im.js
│          │      │
│          │      ├─layui   # 引入的 js 文件
│          │         │
│          │         ├─css
│          │         │  │  layui.css
│          │         │  │  layui.mobile.css
│          │         │  │
│          │         │  └─modules
│          │         │      │
│          │         │      └─layim
│          │         │          │  layim.css
│          │         │          │
│          │         │          ├─html
│          │         │          │      chatlog.html
│          │         │          │      find.html
│          │         │          │      getmsg.json
│          │         │          │      msgbox.html
│          │         │          │
│          │         │          ├─mobile
│          │         │          │      layim.css
│          │         │          │
│          │         │          ├─skin
│          │         │          │      1.jpg
│          │         │          │      2.jpg
│          │         │          │      3.jpg
│          │         │          │      4.jpg
│          │         │          │      5.jpg
│          │         │          │      logo.jpg
│          │         │          │
│          │         │          └─voice
│          │         │                  default.mp3
│          │         │                  default.wav
│          │         │
│          │         └─lay
│          │             └─modules
│          │                    │  layim.js
│          │
│          ├─templates
│          │  └─inc
│          │         layout.ftl
```

## 4.1 集成 WebSocket-tio 环境

- `pom.xml` ：项目依赖，【tio：网络群聊】

```xml
<dependencies>
  <!--websocket-tio：网络群聊-->
  <!--参考：https://www.layui.com/layim/-->
  <dependency>
    <groupId>org.t-io</groupId>
    <artifactId>tio-websocket-server</artifactId>
    <version>3.2.5.v20190101-RELEASE</version>
  </dependency>
</dependencies>
```

- `static/res/layui/lay/modules/layim.js` ：js文件，【拷贝 `layim.js` -> `static/res/layui/lay/modules/`】
- `static/res/layui/css/modules/layim/...` ：css文件，【拷贝 `layim/...` -> `static/res/layui/css/modules/`】

## 4.2 配置 WebSocket-tio 环境

- `application.yml` ：配置文件

```yaml
im:
  server:
    port: 9326
```

- `ImServerConfig.java` ：配置类，【执行入口类】

```java
/**
 * 执行入口类 -> 1.启动tio服务（绑定端口），并调用-消息处理器
 *          -> 2.判断-消息处理器-类别【接受字符类型消息：Chat类型、Ping类型】
 */
@Slf4j
@Configuration
public class ImServerConfig {

    @Value("${im.server.port}")
    private int imPort;

    @Bean
    ImServerStarter imServerStarter() {
        try {
            // 启动tio服务（绑定端口）
            ImServerStarter serverStarter = new ImServerStarter(imPort);
            serverStarter.start();

            // 初始化消息处理器类别
            MsgHandlerFactory.init();
            return serverStarter;
        } catch (IOException e) {
            log.error("tio server 启动失败", e);
        }

        return null;
    }
}
```

- `ImServerStarter.java` ：配置类，【1.启动tio服务（绑定端口），并调用-消息处理器】

```java
/**
 * 1.启动tio服务（绑定端口），并调用-消息处理器
 */
@Slf4j
public class ImServerStarter {

    //返回全局变量：使用websocket-tio包中的ImServerStarter【org.tio.websocket.server.WsServerStarter】
    private WsServerStarter starter;

    /**
     * 构造方法：启动tio服务（绑定端口）
     */
    public ImServerStarter(int port) throws IOException {
        //调用【消息处理器】
        IWsMsgHandler handler = new ImWsMsgHandler();
        starter = new WsServerStarter(port, handler);

        //可选【在上下文对象中，设置心跳时间】
        ServerGroupContext serverGroupContext = starter.getServerGroupContext();
        serverGroupContext.setHeartbeatTimeout(50000);
    }

    /**
     * 初始化消息处理器类别
     */
    public void start() throws IOException {
        starter.start();
        log.info("tio server start !!");
    }
}
```

- `ImWsMsgHandler.java` ：配置类，【2.判断-消息处理器-类别【接受字符类型消息：Chat类型、Ping类型】】

```java
/**
 * 2.判断-消息处理器-类别【接受字符类型消息：Chat类型、Ping类型】
 */
@Slf4j
public class ImWsMsgHandler implements IWsMsgHandler {

    /**
     * 握手时候走的方法
     */
    @Override
    public HttpResponse handshake(HttpRequest httpRequest, HttpResponse httpResponse, ChannelContext channelContext) throws Exception {

        // 绑定个人通道
        String userId = httpRequest.getParam("userId");
        log.info("{} --------------> 正在握手！", userId);
        Tio.bindUser(channelContext, userId);

        return httpResponse;
    }

    /**
     * 握手完成之后
     */
    @Override
    public void onAfterHandshaked(HttpRequest httpRequest, HttpResponse httpResponse, ChannelContext channelContext) throws Exception {

        // 绑定群聊通道，群名称叫做：e-group-study
        Tio.bindGroup(channelContext, Consts.IM_GROUP_NAME);
        log.info("{} --------------> 已绑定群！", channelContext.getId());

    }

    /**
     * 接受字节类型消息
     */
    @Override
    public Object onBytes(WsRequest wsRequest, byte[] bytes, ChannelContext channelContext) throws Exception {
        return null;
    }

    /**
     * 接受字符类型消息
     */
    @Override
    public Object onText(WsRequest wsRequest, String text, ChannelContext channelContext) throws Exception {
        if(text != null && text.indexOf("ping") < 0) {
            log.info("接收到信息——————————————————>{}", text);
        }

        Map map = JSONUtil.toBean(text, Map.class);
        String type = MapUtil.getStr(map, "type");
        String data = MapUtil.getStr(map, "data");

        //处理消息
        MsgHandler handler = MsgHandlerFactory.getMsgHandler(type);
        handler.handler(data, wsRequest, channelContext);
        return null;
    }

    /**
     * 链接关闭时候方法
     */
    @Override
    public Object onClose(WsRequest wsRequest, byte[] bytes, ChannelContext channelContext) throws Exception {

        return null;
    }
}
```

## 4.3 使用 WebSocket-tio 环境

- `ChatController.java` ：控制层

```java
@RestController
@RequestMapping("/chat")
public class ChatController extends BaseController {

    @GetMapping("/getMineAndGroupData")
    public Result getMineAndGroupData() {
        //默认群
        Map<String, Object> group = new HashMap<>();
        group.put("name", "社区群聊");
        group.put("type", "group");
        group.put("avatar", "http://tp1.sinaimg.cn/5619439268/180/40030060651/1");
        group.put("id", Consts.IM_GROUP_ID);
        group.put("members", 0);

        ImUser user = chatService.getCurrentUser();
        return Result.success(MapUtil.builder()
                .put("group", group)
                .put("mine", user)
                .map());
    }

    @GetMapping("/getGroupHistoryMsg")
    public Result getGroupHistoryMsg() {

        List<Object> messages = chatService.getGroupHistoryMsg(20);
        return Result.success(messages);
    }
}
```

- `ChatService.java` ：业务层接口

```java
public interface ChatService {
    ImUser getCurrentUser();

    void setGroupHistoryMsg(ImMess responseMess);

    List<Object> getGroupHistoryMsg(int count);
}
```

- `ChatServiceImpl.java` ：业务层实现

```java
@Slf4j
@Service("chatService")
public class ChatServiceImpl implements ChatService {

    @Autowired
    RedisUtil redisUtil;

    @Override
    public ImUser getCurrentUser() {
        AccountProfile profile = (AccountProfile) SecurityUtils.getSubject().getPrincipal();

        ImUser user = new ImUser();

        if(profile != null) {
            user.setId(profile.getId());
            user.setAvatar(profile.getAvatar());
            user.setUsername(profile.getUsername());
            user.setStatus(ImUser.ONLINE_STATUS);

        } else {
            user.setAvatar("http://tp1.sinaimg.cn/5619439268/180/40030060651/1");

            // 匿名用户处理
            Long imUserId = (Long) SecurityUtils.getSubject().getSession().getAttribute("imUserId");
            user.setId(imUserId != null ? imUserId : RandomUtil.randomLong());

            SecurityUtils.getSubject().getSession().setAttribute("imUserId", user.getId());

            user.setSign("never give up!");
            user.setUsername("匿名用户");
            user.setStatus(ImUser.ONLINE_STATUS);
        }

        return user;
    }

    @Override
    public void setGroupHistoryMsg(ImMess imMess) {
        redisUtil.lSet(Consts.IM_GROUP_HISTROY_MSG_KEY, imMess, 24 * 60 * 60);
    }

    @Override
    public List<Object> getGroupHistoryMsg(int count) {
        long length = redisUtil.lGetListSize(Consts.IM_GROUP_HISTROY_MSG_KEY);
        return redisUtil.lGet(Consts.IM_GROUP_HISTROY_MSG_KEY, length - count < 0 ? 0 : length - count, length);
    }
}
```

## 4.3 编写 chat.js、im.js 文件

- `chat.js` ：js文件，【layim 聊天窗口（chat.js 调用 im.js 方法）】

```javascript
/**
 * layim 聊天窗口（chat.js 调用 im.js 方法）
 */
layui.use('layim', function (layim) {

  var $ = layui.jquery;
  layim.config({
    brief: true //是否简约模式（如果true则不显示主面板）
    , voice: false
    , chatLog: layui.cache.dir + 'css/modules/layim/html/chatlog.html'
  });

  var tiows = new tio.ws($, layim);

  //1.【获取个人、群聊信息】 + 【打开聊天窗口】
  tiows.openChatWindow();

  //2.【查看历史聊天记录 - 回显】
  tiows.initHistoryMess();

  //3.【使用websocket建立连接】
  tiows.connect();

  //4.【发送消息】
  layim.on('sendMessage', function (res) {
    tiows.sendChatMessage(res);
  });
});

```

- `im.js` ：js文件，【layim 聊天窗口（chat.js 调用 im.js 方法）】

```javascript
/**
 * layim 聊天窗口（chat.js 调用 im.js 方法）
 */
if (typeof (tio) == "undefined") {
  tio = {};
}
tio.ws = {};
tio.ws = function ($, layim) {

  this.heartbeatTimeout = 5000; // 心跳超时时间，单位：毫秒
  this.heartbeatSendInterval = this.heartbeatTimeout / 2;
  var self = this;

  //【使用websocket建立连接】
  this.connect = function () {
    var url = "ws://127.0.0.1:9326?userId=" + self.userId;
    var socket = new WebSocket(url);

    self.socket = socket;

    socket.onopen = function () {
      console.log("tio ws 启动~");

      self.lastInteractionTime(new Date().getTime());

      //建立心跳
      self.ping();
    };

    socket.onclose = function () {
      console.log("tio ws 关闭~");

      //尝试重连
      self.reconn();
    }
    socket.onmessage = function (res) {
      console.log("接收到消息！！")
      console.log(res)

      var msgBody = eval('(' + res.data + ')');
      if (msgBody.emit === 'chatMessage') {
        layim.getMessage(msgBody.data);
      }

      self.lastInteractionTime(new Date().getTime());
    }
  };

  //【获取个人、群聊信息】 + 【打开聊天窗口】
  this.openChatWindow = function () {
    // 获取个人信息
    $.ajax({
      url: "/chat/getMineAndGroupData",
      async: false,
      success: function (res) {
        self.group = res.data.group;
        self.mine = res.data.mine;
        self.userId = self.mine.id;
      }
    });

    console.log(self.group);
    console.log(self.mine);
    var cache = layui.layim.cache();
    cache.mine = self.mine;

    // 打开窗口
    layim.chat(self.group);
    layim.setChatMin(); //收缩聊天面板
  };

  //【发送消息】
  this.sendChatMessage = function (res) {
    self.socket.send(JSON.stringify({
      type: 'chatMessage'
      ,data: res
    }));
  }

  //【查看历史聊天记录 - 回显】
  this.initHistoryMess = function () {
    localStorage.clear();
    $.ajax({
      url: '/chat/getGroupHistoryMsg',
      success: function (res) {
        var data = res.data;
        if(data.length < 1) {
          return;
        }

        for (var i in data){
          layim.getMessage(data[i]);
        }
      }
    });
  }

  //【最后的交互时间】
  this.lastInteractionTime = function () {
    // debugger;
    if (arguments.length == 1) {
      this.lastInteractionTimeValue = arguments[0]
    }
    return this.lastInteractionTimeValue
  }

  //【建立心跳】
  this.ping = function () {
    console.log("------------->准备心跳中~");

    //建立一个定时器，定时心跳
    self.pingIntervalId = setInterval(function () {
      var iv = new Date().getTime() - self.lastInteractionTime(); // 已经多久没发消息了

      // debugger;

      // 单位：秒
      if ((self.heartbeatSendInterval + iv) >= self.heartbeatTimeout) {
        self.socket.send(JSON.stringify({
          type: 'pingMessage'
          , data: 'ping'
        }))
        console.log("------------->心跳中~")
      }
    }, self.heartbeatSendInterval)
  };

  //【尝试重连：心跳机制、重连机制】
  this.reconn = function () {
    // 先删除心跳定时器
    clearInterval(self.pingIntervalId);
    // 然后尝试重连
    self.connect();
  };
}
```

## 4.4 使用 chat.js、im.js 文件

- `layout.ftl` ：模板引擎，【引入 im.js、chat.js】

```injectedfreemarker
<#macro layout title>
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <meta name="keywords" content="fly,layui,前端社区">
    <meta name="description" content="Fly社区是模块化前端UI框架Layui的官网社区，致力于为web开发提供强劲动力">
    <link rel="stylesheet" href="/res/layui/css/layui.css">
    <link rel="stylesheet" href="/res/css/global.css">

    <#--导入顺序：im.js 一定要在 chat.js 前-->
    <script src="/res/layui/layui.js"></script>
    <script src="/res/js/jquery.min.js"></script>
    <script src="/res/js/sockjs.js"></script>
    <script src="/res/js/stomp.js"></script>
    <script src="/res/js/im.js"></script>
    <script src="/res/js/chat.js"></script>
  </head>
  <body>
</#macro>
```
