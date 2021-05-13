# Part05-集成Shiro实现个人账户-我的消息

```text
blog
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          ├─controller
│      │          │      BaseController.java
│      │          │      UserController.java
│      │          │
│      │          ├─service
│      │          │  │  UserService.java
│      │          │  │
│      │          │  └─impl
│      │          │         UserServiceImpl.java
│      │          │
│      │          ├─vo
│      │          │      UserMessageVo.java
│      │          │
│      │          ├─shiro
│      │          │      AccountRealm.java
│      │
│      └─resources
│          ├─templates
│          │  ├─inc
│          │  │     layout.ftl
│          │  │
│          │  └─user
│          │        index.ftl
```

## 5.1 个人账户：我的消息【查询消息】

- `UserController.java` ：控制层，【查询消息】

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
        return "/user/mess";
    }
}
```

- `UserMessageVo.java` ：实体类

```java
@Data
public class UserMessageVo extends UserMessage {
    /**
     * 我的消息的【接收消息的用户ID】-用户名name     未使用
     */
    private String toUserName;

    /**
     * 我的消息的【发送消息的用户ID】-用户名name
     */
    private String fromUserName;

    /**
     * 我的消息的【关联的文章ID】-文章标题title
     */
    private String postTitle;

    /**
     * 我的消息的【关联的文章-对应的评论ID】-评论内容content
     */
    private String commentContent;
}
```

- `UserMessageMapper.xml` ：数据层实现

```xml
<select id="selectMessages" resultType="org.myslayers.vo.UserMessageVo">
    SELECT m.*,
        (
            SELECT username
            FROM `m_user`
            WHERE id = m.from_user_id
        ) AS fromUserName,
        (
            SELECT title
            FROM `m_post`
            WHERE id = m.post_id
        ) AS postTitle,
        (
            SELECT content
            FROM `m_comment`
            WHERE id = m.comment_id
        ) AS commentContent
    FROM `m_user_message` m
        ${ew.customSqlSegment}
</select>
```

- `index.ftl` ：模板引擎

```injectedfreemarker
<#--宏layout.ftl（导航栏 + 页脚）-->
<#include "/inc/layout.ftl"/>
<#--宏common.ftl（个人账户-左侧链接（我的主页、用户中心、基本设置、我的消息），分页）-->
<#include "/inc/common.ftl"/>

<#--【三、填充（导航栏 + 页脚）】-->
<@layout "用户中心">

    <div class="layui-container fly-marginTop fly-user-main">
        <#--用户中心-左侧链接（我的主页、用户中心、基本设置、我的消息）-->
        <@centerLeft level=3></@centerLeft>

        <div class="site-tree-mobile layui-hide">
            <i class="layui-icon">&#xe602;</i>
        </div>
        <div class="site-mobile-shade"></div>

        <div class="site-tree-mobile layui-hide">
            <i class="layui-icon">&#xe602;</i>
        </div>
        <div class="site-mobile-shade"></div>

        <div class="fly-panel fly-panel-user" pad20>
            <div class="layui-tab layui-tab-brief" lay-filter="user" id="LAY_msg" style="margin-top: 15px;">
                <button class="layui-btn layui-btn-danger" id="LAY_delallmsg">清空全部消息</button>
                <div id="LAY_minemsg" style="margin-top: 10px;">
                    <ul class="mine-msg">

                        <#--我的消息的【消息的类型】：0代表系统消息、1代表评论的文章、2代表评论的评论-->
                        <#list pageData.records as mess>
                            <li data-id="${mess.id}">
                                <blockquote class="layui-elem-quote">
                                    <#if mess.type == 0>
                                        系统消息：${mess.content}
                                    </#if>
                                    <#if mess.type == 1>
                                        ${mess.fromUserName} 评论了你的文章 <${mess.postTitle}>，内容是 (${mess.commentContent})
                                    </#if>
                                    <#if mess.type == 2>
                                        ${mess.fromUserName} 回复了你的评论 (${mess.commentContent})，文章是 <${mess.postTitle}>
                                    </#if>
                                </blockquote>
                                <p>
                                    <span>
                                        ${timeAgo(mess.created)}
                                    </span>
                                    <a class="layui-btn layui-btn-small layui-btn-danger fly-delete" href="javascript:;">
                                        删除
                                    </a>
                                </p>
                            </li>
                        </#list>

                    </ul>
                </div>
            </div>
        </div>
    </div>

    <script>
        layui.cache.page = 'user';
    </script>

</@layout>
```

## 5.2 个人账户：我的消息【删除单个消息 或 删除全部消息】

- `UserController.java` ：控制层，【删除单个消息 或 删除全部消息】

```java
@Controller
public class UserController extends BaseController {
    /**
     * 我的消息：删除单个消息 或 删除全部消息（前端参数包含“all=true”，如果为ture时，使用【.eq(!all, "id", id))】 删除全部消息）
     */
    @ResponseBody
    @PostMapping("/message/remove/")
    public Result msgRemove(Long id, @RequestParam(defaultValue = "false") Boolean all) {
        boolean remove = messageService.remove(new QueryWrapper<UserMessage>()
                .eq("to_user_id", getProfileId())
                .eq(!all, "id", id));
        return remove ? Result.success(null) : Result.fail("删除失败");
    }

    /**
     * 我的消息：使用layout.ftl中 利用session来实现【登录状态】 后，发现【接口异常】，
     *         查看后发现，【/res/mods/index.js】源码，【新消息通知 -> layui.cache.user.uid !== -1】 -> 因此补充 status、count 数据接口
     */
    @ResponseBody
    @PostMapping("/message/nums/")
    public Map msgNums() {
        int count = messageService.count(new QueryWrapper<UserMessage>()
                .eq("to_user_id", getProfileId())//全部数量的消息
                .eq("status", "0")           //未读的消息  未读0 已读1
        );
        return MapUtil.builder("status", 0).put("count", count).build();
    }
}
```

## 5.3 个人账户：我的消息【消息弹窗】

- `UserController.java` ：控制层，【消息弹窗】

```java
@Controller
public class UserController extends BaseController {
    /**
     * 我的消息：使用layout.ftl中 利用session来实现【登录状态】 后，发现【接口异常】，
     *         查看后发现，【/res/mods/index.js】源码，【新消息通知 -> layui.cache.user.uid !== -1】 -> 因此补充 status、count 数据接口
     */
    @ResponseBody
    @PostMapping("/message/nums/")
    public Map msgNums() {
        int count = messageService.count(new QueryWrapper<UserMessage>()
                .eq("to_user_id", getProfileId())//全部数量的消息
                .eq("status", "0")           //未读的消息  未读0 已读1
        );
        return MapUtil.builder("status", 0).put("count", count).build();
    }
}
```

- `/res/mods/index.js` ：源码可知，如果 `res.status === 0 && res.count > 0`，会出现弹窗【你有 X 条未读消息】

```javascript
//新消息通知
newmsg: function () {
    var elemUser = $('.fly-nav-user');
    if (layui.cache.user.uid !== -1 && elemUser[0]) {
        fly.json('/message/nums/', {
            _: new Date().getTime()
        }, function (res) {
            if (res.status === 0 && res.count > 0) {
                var msg = $('<a class="fly-nav-msg" href="javascript:;">' + res.count + '</a>');
                elemUser.append(msg);
                msg.on('click', function () {
                    fly.json('/message/read', {}, function (res) {
                        if (res.status === 0) {
                            location.href = '/user/message/';
                        }
                    });
                });
                layer.tips('你有 ' + res.count + ' 条未读消息', msg, {
                    tips: 3
                    , tipsMore: true
                    , fixed: true
                });
                msg.on('mouseenter', function () {
                    layer.closeAll('tips');
                })
            }
        });
    }
    return arguments.callee;
}
```

## 5.4 其他：`layout.ftl` 中 `script` 设置用户登录状态

1. 方式一：利用 shiro 来实现【登录状态】

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
    </head>
    <body>

    <#--【一、导航栏】-->
    <#include "/inc/header.ftl"/>

    <#--【三、所有引用该“带有宏的标签layout.ftl”都会执行该操作：<@layout "首页"></@layout>中的数据 -> 填充到<#nested/>标签中】-->
    <#nested>

    <#--【四、页脚】-->
    <#include "/inc/footer.ftl"/>

    <script>
        <#-----------------方式一：利用shiro来实现【登录状态】---------------------->
        <#--未登录的状态-->
        <#--【shiro.guest】：验证当前用户是否为 “访客”，即未认证（包含未记住）的用户-->
        <@shiro.guest>
            // layui.cache.page = '';
            layui.cache.user = {
                username: '游客'
                , uid: -1
                , avatar: '/res/images/avatar/00.jpg'
                , experience: 83
                , sex: '男'
            };
            layui.config({
                version: "3.0.0"
                ,base: '/res/mods/' //这里实际使用时，建议改成绝对路径
            }).extend({
                fly: 'index'
            }).use('fly');
        </@shiro.guest>

        <#--登录后的状态-->
        <#--【shiro.user】：认证通过或已记住的用户-->
        <@shiro.user>
            // layui.cache.page = '';
            layui.cache.user = {
                username: <@shiro.principal property="username"/>
                , uid: <@shiro.principal property="id"/>
                , avatar: <@shiro.principal property="avatar"/>
                , experience: 83
                , sex: <@shiro.principal property="gender"/>
            };
            layui.config({
                version: "3.0.0"
                , base: '/res/mods/' //这里实际使用时，建议改成绝对路径
            }).extend({
                fly: 'index'
            }).use('fly');
        </@shiro.user>
    </script>

    </body>
    </html>
</#macro>
```

2.方式二：利用 session 来实现【登录状态】，修改【更新资料/更新头像】后，需要【手动更新 shiro/session 数据】

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
    </head>
    <body>

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

    </body>
    </html>
</#macro>
```

- `AccountRealm.java` ：配置类，【手动更新 shiro/session 数据】

```java
/**
 * AccountRealm：重写父类AuthorizingRealm方法
 */
@Component
public class AccountRealm extends AuthorizingRealm {

    @Autowired
    UserService userService;

    @Override
    protected AuthorizationInfo doGetAuthorizationInfo(PrincipalCollection principals) {
        return null;
    }

    @Override
    protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken token) throws AuthenticationException {
        // 1.获取Token
        UsernamePasswordToken usernamePasswordToken = (UsernamePasswordToken) token;
        // 2.根据token获取username、password，并进行login登录，返回AccountProfile账户信息
        AccountProfile profile = userService.login(usernamePasswordToken.getUsername(), String.valueOf(usernamePasswordToken.getPassword()));
        // 3.通过profile、token.getCredentials()、getName()，获取AuthenticationInfo子接口对象（SimpleAuthenticationInfo）
        SimpleAuthenticationInfo info = new SimpleAuthenticationInfo(profile, token.getCredentials(), getName());

        // 方式二：利用session来实现【登录状态】，修改【更新资料/更新头像】后，需要【手动更新shiro/session数据】
        SecurityUtils.getSubject().getSession().setAttribute("profile", profile);
        return info;
    }
}
```

- `UserController.java` ：控制层，【手动更新 shiro/session 数据】

```java
@Controller
public class UserController extends BaseController {
    /**
     * 基本设置：更新资料
     */
    @ResponseBody
    @PostMapping("/user/set")
    public Result doSet(User user) {
        //校验：昵称不能为空
        if (StrUtil.isBlank(user.getUsername())) {
            return Result.fail("昵称不能为空");
        }

        //校验：从数据库中查询【username是否存在】、【id并非当前用户】，如果count > 0，则代表“该昵称已被占用”
        int count = userService.count(new QueryWrapper<User>()
                .eq("username", getProfile().getUsername())
                .ne("id", getProfileId()));
        if (count > 0) {
            return Result.fail("该昵称已被占用");
        }

        //更新显示【数据库】：username、gender、sign -> 数据库 -> 刷新页面
        User temp = userService.getById(getProfileId());
        temp.setUsername(user.getUsername());
        temp.setGender(user.getGender());
        temp.setSign(user.getSign());
        userService.updateById(temp);

        //更新显示【Shiro】：更新 “AccountRealm类中，返回的AccountProfile对象” -> 【header.ftl】
        AccountProfile profile = getProfile();
        profile.setUsername(temp.getUsername());
        profile.setSign(temp.getSign());

        //方式二：利用session来实现【登录状态】，修改【更新资料/更新头像】后，需要【手动更新shiro/session数据】
        SecurityUtils.getSubject().getSession().setAttribute("profile", profile);

        return Result.success().action("/user/set#info");
    }

    /**
     * 基本设置：更新头像
     */
    @ResponseBody
    @PostMapping("/user/setAvatar")
    public Result doAvatar(User user) {
        if (StrUtil.isNotBlank(user.getAvatar())) {
            //更新显示【数据库】：avatar -> 数据库 -> 刷新页面
            User temp = userService.getById(getProfileId());
            temp.setAvatar(user.getAvatar());
            userService.updateById(temp);

            //更新显示【Shiro】：更新 “AccountRealm类中，返回的AccountProfile对象” -> 【header.ftl】
            AccountProfile profile = getProfile();
            profile.setAvatar(user.getAvatar());

            //方式二：利用session来实现【登录状态】，修改【更新资料/更新头像】后，需要【手动更新shiro/session数据】
            SecurityUtils.getSubject().getSession().setAttribute("profile", profile);

            return Result.success().action("/user/set#avatar");
        }
        return Result.success().action("/user/set#avatar");
    }
}
```
