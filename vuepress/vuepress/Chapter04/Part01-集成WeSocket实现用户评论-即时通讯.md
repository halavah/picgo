# Part01-集成WeSocket实现用户评论-即时通讯

```text
blog
│  pom.xml
│
└─src
│  └─main
│      ├─java
│      │   └─org
│      │      └─myslayers
│      │          ├─config
│      │          │      WsConfig.java
│      │          │
│      │          ├─controller
│      │          │      BaseController.java
│      │          │      PostController.java
│      │          │
│      │          ├─service
│      │          │  │   WsService.java
│      │          │  │
│      │          │  └─impl
│      │          │         WsServiceImpl.java
│      │
│      └─resources
│          ├─templates
│          │  └─inc
│          │         layout.ftl
```

## 1.1 集成 WebSocket 环境

- `pom.xml` ：项目依赖，【websocket 通讯】

```xml
<dependencies>
  <!--websocket-->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
  </dependency>
</dependencies>
```

## 1.2 配置 WebSocket 环境

- `WsConfig.java` ：配置类，【点对点通讯，订阅通道/user/、/topic/，访问地址/websocket】

```java
/**
 * WebSocket 配置类：点对点
 */
@EnableAsync //开启异步消息
@Configuration
@EnableWebSocketMessageBroker //表示开启使用STOMP协议的消息代理
public class WsConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/websocket") // 注册一个端点：websocket的访问地址
            .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/user/", "/topic/"); //推送消息的前缀
        registry.setApplicationDestinationPrefixes("/app"); //注册代理点
    }
}
```

- `layout.ftl` ：模板引擎，【引入 sockjs.js、stomp.js】

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

    <#--导入script-->
    <script src="/res/layui/layui.js"></script>
    <script src="/res/js/jquery.min.js"></script>
    <script src="/res/js/sockjs.js"></script>
    <script src="/res/js/stomp.js"></script>
  </head>
  <body>
</#macro>
```

## 1.3 使用 WebSocket 通讯

- `PostController.java` ：控制层，【即时通知作者（websocket）】

```java
@Controller
public class PostController extends BaseController {
    /**
     * 详情detail：【评论】文章
     */
    @ResponseBody
    @Transactional
    @PostMapping("/post/reply/")
    public Result reply(Long jid, String content) {
        Assert.notNull(jid, "找不到对应的文章");
        Assert.hasLength(content, "评论内容不能为空");

        Post post = postService.getById(jid);
        Assert.isTrue(post != null, "该文章已被删除");

        // 新增评论
        Comment comment = new Comment();
        comment.setPostId(jid);
        comment.setContent(content);
        comment.setUserId(getProfileId());
        comment.setCreated(new Date());
        comment.setModified(new Date());
        comment.setLevel(0);
        comment.setVoteDown(0);
        comment.setVoteUp(0);
        commentService.save(comment);

        // 评论数量+1
        post.setCommentCount(post.getCommentCount() + 1);
        postService.updateById(post);

        // 本周热议数量+1
        postService.incrCommentCountAndUnionForWeekRank(post, true);

        // 通知作者，有人评论了你的文章
        // 作者自己评论自己文章，不需要通知
        if (comment.getUserId() != post.getUserId()) {
            UserMessage message = new UserMessage();
            message.setFromUserId(getProfileId());
            message.setToUserId(post.getUserId());
            message.setPostId(jid);
            message.setCommentId(comment.getId());
            message.setType(1); //我的消息的【消息的类型】：0代表系统消息、1代表评论的文章、2代表回复的评论
            message.setStatus(0); //我的消息的【状态】：0代表未读、1代表已读
            message.setCreated(new Date());
            messageService.save(message);

            // 即时通知【文章作者】（websocket）
            wsService.sendMessCountToUser(message.getToUserId());
        }

        // 通知被@的人，有人回复了你的文章
        if (content.startsWith("@")) {
            String username = content.substring(1, content.indexOf(" "));
            User user = userService.getOne(new QueryWrapper<User>().eq("username", username));
            if (user != null) {
                UserMessage message = new UserMessage();
                message.setFromUserId(getProfileId());
                message.setToUserId(post.getUserId());
                message.setPostId(jid);
                message.setCommentId(comment.getId());
                message.setType(2); //我的消息的【消息的类型】：0代表系统消息、1代表评论的文章、2代表回复的评论
                message.setStatus(0); //我的消息的【状态】：0代表未读、1代表已读
                message.setCreated(new Date());
                messageService.save(message);

                // 即时通知【被@的用户】（websocket）
            }
        }

        return Result.success().action("/post/" + post.getId());
    }
}
```

- `WsServiceImpl.java` ：业务层实现，【使用 Spring 自带的【消息模板】，向 ToUserId 发生消息，url 为 /user/20/messCount/ 】

```java
@Service
public class WsServiceImpl implements WsService {

    @Autowired
    UserMessageService messageService;

    @Autowired
    SimpMessagingTemplate messagingTemplate;    //Spring自带的【消息模板】

    @Async  //异步消息
    @Override
    public void sendMessCountToUser(Long toUserId) {
        int count = messageService.count(new QueryWrapper<UserMessage>()
            .eq("to_user_id", toUserId) //全部数量的消息
            .eq("status", "0")      //未读的消息  未读0 已读1
        );

        // websocket 使用 messagingTemplate模板 进行通知，拼凑结果url为：/user/20/messCount/
        // super.convertAndSend(this.destinationPrefix + user + destination, payload, headers, postProcessor);
        messagingTemplate.convertAndSendToUser(toUserId.toString(), "/messCount", count);
    }
}
```

- `layout.ftl` ：模板引擎

```injectedfreemarker
<#--宏：1.macro定义脚本，名为layout，参数为title-->
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

    <#--导入script-->
    <script src="/res/layui/layui.js"></script>
    <script src="/res/js/jquery.min.js"></script>
    <script src="/res/js/sockjs.js"></script>
    <script src="/res/js/stomp.js"></script>
  </head>
  <body>

  <#--宏common.ftl：分页、一条数据posting、个人账户-左侧链接（我的主页、用户中心、基本设置、我的消息）-->
  <#include "/inc/common.ftl" /><#--经过测试，发现common公共包，必须在header.ftl等之前进行“include导入”-->

  <#--【一、导航栏】-->
  <#include "/inc/header.ftl"/>

  <#--【三、所有引用该“带有宏的标签layout.ftl”都会执行该操作：<@layout "首页"></@layout>中的数据 -> 填充到<#nested/>标签中】-->
  <#nested>

  <#--【四、页脚】-->
  <#include "/inc/footer.ftl"/>

  <script>
    <#-----------------方式二：利用session来实现【登录状态】---------------------->
    // layui.cache.page = '';
    layui.cache.user = {
      username: '${profile.username!"游客"}'
      , uid: ${profile.id!"-1"}
      , avatar: '${profile.avatar!"/res/images/avatar/00.jpg"}'
      , experience: 83
      , sex: '${profile.gender!"男"}'
    };

    layui.config({
      version: "3.0.0"
      , base: '/res/mods/' //这里实际使用时，建议改成绝对路径
    }).extend({
      fly: 'index'
    }).use('fly');
  </script>

  <script>
    <#--使用ws实现【评论消息的即时通讯】-->
    $(function () {
      var elemUser = $('.fly-nav-user');
      if (layui.cache.user.uid !== -1 && elemUser[0]) { //根据layui使用，layui.cache.user.uid !== -1 时，表示【用户登录成功】
        var socket = new SockJS("/websocket") //注册一个端点：websocket的访问地址
        stompClient = Stomp.over(socket);
        stompClient.connect({}, function (frame) {
          //subscribe订阅消息
          stompClient.subscribe("/user/" + ${profile.id} + "/messCount", function (res) {
            console.log(res);
            showTips(res.body);   //消息的显示：弹窗
          })
        });

      }
    });

    //消息的显示：弹窗，【将/res/mods/index.js中的消息弹窗 -> 复制到此处，供ws使用】
    function showTips(count) {
      var msg = $('<a class="fly-nav-msg" href="javascript:;">' + count + '</a>');
      var elemUser = $('.fly-nav-user');
      elemUser.append(msg);
      //click，点击跳转【用户中心 /user/mess】
      msg.on('click', function () {
        location.href = "/user/mess";
      });
      //tips，提示【你有X条未读消息】
      layer.tips('你有 ' + count + ' 条未读消息', msg, {
        tips: 3
        , tipsMore: true
        , fixed: true
      });
      msg.on('mouseenter', function () {
        layer.closeAll('tips');
      })
    }
  </script>

  </body>
  </html>
</#macro>
```

## 1.4 其他：用户中心-批量将未读改为已读

- `UserController.java` ：控制层，【批量处理，将全部消息的【状态：未读 0】改为【状态：已读 1】，并【批量修改 状态为已读 1】】

```java
@Controller
public class UserController extends BaseController {
    /**
     * 我的消息：查询消息
     */
    @GetMapping("/user/mess")
    public String mess() {
        IPage<UserMessageVo> page = messageService.paging(getPage(), new QueryWrapper<UserMessage>()
            .eq("to_user_id", getProfileId())
            .orderByDesc("created")
        );
        req.setAttribute("pageData", page);

        //查看消息时，将全部消息的【状态：未读0】改为【状态：已读1】，并【批量修改 状态为已读1】
        List<Long> ids = new ArrayList<>();
        for (UserMessageVo messageVo : page.getRecords()) {
            if (messageVo.getStatus() == 0) {
                ids.add(messageVo.getId());
            }
        }
        messageService.updateToReaded(ids); //批量处理

        return "/user/mess";
    }
}
```

- `UserMessageServiceImpl.java` ：业务层实现，【批量处理】

```java
@Service
public class UserMessageServiceImpl extends ServiceImpl<UserMessageMapper, UserMessage> implements UserMessageService {

    @Override
    public void updateToReaded(List<Long> ids) {
        if (ids.isEmpty()) {
            return;
        }
        messageMapper.updateToReaded(new QueryWrapper<UserMessage>()
            .in("id", ids)
        );
    }
}
```

- `UserMessageMapper.java` ：数据层接口，【开启事务】

```java
public interface UserMessageMapper extends BaseMapper<UserMessage> {

    @Transactional
    void updateToReaded(@Param(Constants.WRAPPER) QueryWrapper<UserMessage> wrapper);
}
```

- `UserMessageMapper.xml` ：数据层实现，【SQL 命令】

```xml
<update id="updateToReaded">
  UPDATE m_user_message
  SET status = 1
  ${ew.customSqlSegment}
</update>
```
