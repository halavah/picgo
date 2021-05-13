# Part03-集成Shiro实现个人账户-我的主页、基本设置

```text
blog
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          ├─common
│      │          │  └─lang
│      │          │         Consts.java
│      │          │
│      │          ├─config
│      │          │      SpringMvcConfig.java
│      │          │
│      │          ├─controller
│      │          │      BaseController.java
│      │          │      UserController.java
│      │          │
│      │          ├─service
│      │          │  │  UserService.java
│      │          │  │
│      │          │  └─impl
│      │          │         UserServiceImpl.java
│      │          ├
│      │          ├─utils
│      │          │      UploadUtil.java
│      │
│      └─resources
│          │  application.yml
│          │
│          ├─templates
│          │  └─user
│          │        home.ftl
│          │        set.ftl
```

## 3.1 个人账户：我的主页

- `UserController.java` ：控制层

```java
@Controller
public class UserController extends BaseController {

    /**
     * 我的主页
     */
    @GetMapping("/user/home")
    public String home() {
        //用户：从Shiro中获取用户
        User user = userService.getById(getProfileId());
        req.setAttribute("user", user);

        //文章：用户近期【30天】的文章
        List<Post> posts = postService.list(new QueryWrapper<Post>()
                .eq("user_id", getProfileId())
                .orderByDesc("created")
        );
        req.setAttribute("posts", posts);

        return "/user/home";
    }
}
```

- `home.ftl` ：模板引擎

```injectedfreemarker
<#--宏layout.ftl（导航栏 + 页脚）-->
<#include "/inc/layout.ftl"/>

<#--【三、填充（导航栏 + 页脚）】-->
<@layout "我的主页">

    <#--1.用户基本信息-->
    <div class="fly-home fly-panel" >
        <#--头像-->
        <img src="${user.avatar}" alt="贤心">
        <i class="iconfont icon-renzheng" title="Fly社区认证"></i>

        <#--作者信息-->
        <h1>
            ${user.username}
            <i class="iconfont icon-nan"></i>
            <i class="layui-badge fly-badge-vip">SVIP</i>
        </h1>

        <#--创建时间-->
        <p class="fly-home-info">
            <i class="iconfont icon-kiss" title="飞吻"></i><span style="color: #FF7200;">66666 飞吻</span>
            <i class="iconfont icon-shijian"></i><span>${timeAgo(user.created)} 加入</span>
        </p>

        <#--个性签名-->
        <p class="fly-home-sign">
            ${user.sign!'这个人好懒，什么都没留下！'}
        </p>
    </div>

    <#--2.最近的提问 + 最近的回答-->
    <div class="layui-container">
        <div class="layui-row layui-col-space15">
            <#--用户近期【30天】的文章-->
            <div class="layui-col-md6 fly-home-jie">
                <div class="fly-panel">
                    <h3 class="fly-panel-title">${user.username} 最近的提问</h3>
                    <ul class="jie-row">
                        <#list posts as post>
                            <li>
                                <#if post.recommend>
                                    <span class="fly-jing">精</span>
                                </#if>
                                <a href="/post/${post.id}" class="jie-title">
                                    ${post.title}
                                </a>
                                <i>${timeAgo(post.created)}</i>
                                <em class="layui-hide-xs">
                                    ${post.viewCount}阅/${post.commentCount}答
                                </em>
                            </li>
                        </#list>
                        <#if !posts>
                            <div class="fly-none" style="min-height: 50px; padding:30px 0; height:auto;">
                                <i style="font-size:14px;">没有发表任何求解</i>
                            </div>
                        </#if>
                    </ul>
                </div>
            </div>
            <#--最近的回答-->
            <div class="layui-col-md6 fly-home-da">
                <div class="fly-panel">
                    <h3 class="fly-panel-title">${user.username} 最近的回答</h3>
                    <ul class="home-jieda">
                        <div class="fly-none" style="min-height: 50px; padding:30px 0; height:auto;"><span>没有回答任何问题</span></div>
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

## 3.2 个人账户：基本设置-更新资料

- `/res/mods/index.js` ：源码可知，【lay-submit】此处默认【表单跳转】reload="true"，则会【重新加载当前页面】

```javascript
//表单提交
form.on('submit(*)', function (data) {
    var action = $(data.form).attr('action'), button = $(data.elem);
    fly.json(action, data.field, function (res) {
        var end = function () {
            /*action属性：跳转路径*/
            if (res.action) {
                location.href = res.action;
            }

            /*解决：基本设置 中 修改个人资料后，无法【重新加载】*/
            if (button.attr('reload')) {
                location.reload();
            }

        };
        if (res.status == 0) {
            button.attr('alert') ? layer.alert(res.msg, {
                icon: 1,
                time: 10 * 1000,
                end: end
            }) : end();
        }
    });
    return false;
});
```

- `UserController.java` ：控制层

```java
@Controller
public class UserController extends BaseController {
    /**
     * 基本设置
     */
    @GetMapping("/user/set")
    public String set() {
        //用户：从Shiro中获取用户
        User user = userService.getById(getProfileId());
        req.setAttribute("user", user);

        return "/user/set";
    }

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

        return Result.success().action("/user/set#info");
    }
}
```

- `set.ftl` ：模板引擎

```injectedfreemarker
<#--1.更新资料-->
<div class="layui-form layui-form-pane layui-tab-item layui-show">
    <form method="post">
        <#--1.1 邮箱-->
        <div class="layui-form-item">
            <label for="L_email" class="layui-form-label">邮箱</label>
            <div class="layui-input-inline">
                <input type="text" id="L_email" name="email" required lay-verify="email"
                       autocomplete="off" value="${user.email}" class="layui-input" readonly>
            </div>
        </div>

        <#--1.2 昵称-->
        <div class="layui-form-item">
            <label for="L_username" class="layui-form-label">昵称</label>
            <div class="layui-input-inline">
                <input type="text" id="L_username" name="username" required lay-verify="required"
                       autocomplete="off" value="${user.username}" class="layui-input">
            </div>
            <div class="layui-inline">
                <div class="layui-input-inline">
                    <input type="radio" name="gender" value="0" <#if user.gender =='0'>checked</#if>
                           title="男">
                    <input type="radio" name="gender" value="1" <#if user.gender =='1'>checked</#if>
                           title="女">
                </div>
            </div>
        </div>

        <#--1.3 签名-->
        <div class="layui-form-item layui-form-text">
            <label for="L_sign" class="layui-form-label">签名</label>
            <div class="layui-input-block">
                <textarea placeholder="" id="L_sign" name="sign" autocomplete="off"
                          class="layui-textarea" style="height: 80px;">${user.sign}</textarea>
            </div>
        </div>
        <#--1.4 确定修改-->
        <div class="layui-form-item">
            <#--通过阅读/res/mods/index.js源码可知，【lay-submit】此处默认【表单跳转】reload="true"，则会【重新加载当前页面】-->
            <button class="layui-btn" key="set-mine" lay-filter="*" lay-submit reload="true"
                    alert="true">确认修改
            </button>
        </div>
    </form>
</div>
```

## 3.2 个人账户：基本设置-更新头像（上传图片）

- `application.yml` ：配置文件，自定义上传路径

```yaml
file:
  upload:
    dir: ${user.dir}/upload
```

- `Consts.java` ：实体类，上传图片（基本设置）

```java
/**
 * 上传图片（基本设置）：封装类
 */
@Data
@Component
public class Consts {

    @Value("${file.upload.dir}")
    private String uploadDir;

    public static final Long IM_DEFAULT_USER_ID = 999L;

    public final static Long IM_GROUP_ID = 999L;
    public final static String IM_GROUP_NAME = "e-group-study";

    //消息类型
    public final static String IM_MESS_TYPE_PING = "pingMessage";
    public final static String IM_MESS_TYPE_CHAT = "chatMessage";

    public static final String IM_ONLINE_MEMBERS_KEY = "online_members_key";
    public static final String IM_GROUP_HISTROY_MSG_KEY = "group_histroy_msg_key";

}
```

- `SpringMvcConfig.java` ：配置类，重写父类 addResourceHandlers 方法（识别非静态资源目录：/upload/avatar/**）

```java
/**
 * SpringMvc配置类
 */
@Configuration
public class SpringMvcConfig implements WebMvcConfigurer {

    @Autowired
    Consts consts;

    /**
     * 重写父类addResourceHandlers方法（识别非静态资源目录：/upload/avatar/**）
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/upload/avatar/**")
                .addResourceLocations("file:///" + consts.getUploadDir() + "/avatar/");
    }
}
```

- `UploadUtil.java` ：工具类，上传图片（基本设置）

```java
/**
 * 上传图片（基本设置）：工具类
 */
@Slf4j
@Component
public class UploadUtil {

    @Autowired
    Consts consts;

    public final static String type_avatar = "avatar";

    public Result upload(String type, MultipartFile file) throws IOException {

        if(StrUtil.isBlank(type) || file.isEmpty()) {
            return Result.fail("上传失败");
        }

        // 获取文件名
        String fileName = file.getOriginalFilename();
        log.info("上传的文件名为：" + fileName);
        // 获取文件的后缀名
        String suffixName = fileName.substring(fileName.lastIndexOf("."));
        log.info("上传的后缀名为：" + suffixName);
        // 文件上传后的路径
        String filePath = consts.getUploadDir();

        if ("avatar".equalsIgnoreCase(type)) {
            AccountProfile profile = (AccountProfile) SecurityUtils.getSubject().getPrincipal();
            fileName = "/avatar/avatar_" + profile.getId() + suffixName;

        } else if ("post".equalsIgnoreCase(type)) {
            fileName = "/post/post_" + DateUtil.format(new Date(), DatePattern.PURE_DATETIME_MS_PATTERN) + suffixName;
        }

        File dest = new File(filePath + fileName);
        // 检测是否存在目录
        if (!dest.getParentFile().exists()) {
            dest.getParentFile().mkdirs();
        }
        try {
            file.transferTo(dest);
            log.info("上传成功后的文件路径为：" + filePath + fileName);

            String path = filePath + fileName;
            String url = "/upload" + fileName;

            log.info("url ---> {}", url);

            return Result.success(url);
        } catch (IllegalStateException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }

        return Result.success(null);

    }

}
```

- `UserController.java` ：控制层，上传头像（Post 请求）

```java
@Controller
public class UserController extends BaseController {
    /**
     * 基本设置：上传头像
     */
    @ResponseBody
    @PostMapping("/user/upload")
    public Result uploadAvatar(@RequestParam(value = "file") MultipartFile file) throws IOException {
        return uploadUtil.upload(UploadUtil.type_avatar, file);
    }
}
```

## 3.3 个人账户：基本设置-更新头像（更新图片）

- `/res/mods/user.js` ：源码可知，修改默认 `Post请求` 更新图片路径，从 `/user/set` 更换为 `/user/setAvatar`

```javascript
//上传图片
if ($('.upload-img')[0]) {
    layui.use('upload', function (upload) {
        var avatarAdd = $('.avatar-add');

        upload.render({
            elem: '.upload-img'
            , url: '/user/upload'
            , size: 50
            , before: function () {
                avatarAdd.find('.loading').show();
            }
            , done: function (res) {
                if (res.status == 0) {
                    /*修改默认post更新图片路径，从/user/set更换为/user/setAvatar*/
                    $.post('/user/setAvatar', {
                        avatar: res.data
                    }, function (res) {
                        location.reload();
                    });
                } else {
                    layer.msg(res.msg, {icon: 5});
                }
                avatarAdd.find('.loading').hide();
            }
            , error: function () {
                avatarAdd.find('.loading').hide();
            }
        });
    });
}
```

- `UserController.java` ：控制层，更新头像（Post 请求）

```java
@Controller
public class UserController extends BaseController {
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

            return Result.success().action("/user/set#avatar");
        }
        return Result.success().action("/user/set#avatar");
    }
}
```

- `set.ftl` ：模板引擎

```injectedfreemarker
<#--2.更新头像-->
<div class="layui-form layui-form-pane layui-tab-item">
    <div class="layui-form-item">
        <div class="avatar-add">
            <p>建议尺寸168*168，支持jpg、png、gif，最大不能超过2048KB</p>
            <button type="button" class="layui-btn upload-img">
                <i class="layui-icon">&#xe67c;</i>上传头像
            </button>
            <#--默认头像-->
            <img src="<@shiro.principal property="avatar" />">
            <span class="loading"></span>
        </div>
    </div>
</div>
```

## 3.4 个人账户：基本设置-更新密码

- `UserController.java` ：控制层，更新密码

```java
@Controller
public class UserController extends BaseController {
    /**
     * 基本设置：更新密码
     */
    @ResponseBody
    @PostMapping("/user/repass")
    public Result repass(String nowpass, String pass, String repass) {
        //判断nowpass与pass两次输入是否一致
        if (!pass.equals(repass)) {
            return Result.fail("两次密码不相同");
        }

        //判断nowpass是否正确
        User user = userService.getById(getProfileId());
        String nowPassMd5 = SecureUtil.md5(nowpass);
        if (!nowPassMd5.equals(user.getPassword())) {
            return Result.fail("密码不正确");
        }

        //如果nowpass正确，则更新密码
        user.setPassword(SecureUtil.md5(pass));
        userService.updateById(user);

        return Result.success().action("/user/set#pass");
    }
}
```

- `set.ftl` ：模板引擎

```injectedfreemarker
<#--3.更新密码-->
<div class="layui-form layui-form-pane layui-tab-item">
    <form action="/user/repass" method="post">
        <#--3.1 当前密码-->
        <div class="layui-form-item">
            <label for="L_nowpass" class="layui-form-label">当前密码</label>
            <div class="layui-input-inline">
                <input type="password" id="L_nowpass" name="nowpass" required lay-verify="required"
                       autocomplete="off" class="layui-input">
            </div>
        </div>
        <#--3.2 新密码-->
        <div class="layui-form-item">
            <label for="L_pass" class="layui-form-label">新密码</label>
            <div class="layui-input-inline">
                <input type="password" id="L_pass" name="pass" required lay-verify="required"
                       autocomplete="off" class="layui-input">
            </div>
            <div class="layui-form-mid layui-word-aux">6到16个字符</div>
        </div>
        <#--3.3 确定密码-->
        <div class="layui-form-item">
            <label for="L_repass" class="layui-form-label">确认密码</label>
            <div class="layui-input-inline">
                <input type="password" id="L_repass" name="repass" required lay-verify="required"
                       autocomplete="off" class="layui-input">
            </div>
        </div>
        <#--3.4 确认修改-->
        <div class="layui-form-item">
            <#--通过阅读/res/mods/index.js源码可知，【lay-submit】此处默认【表单跳转】reload="true"，则会【重新加载当前页面】-->
            <button class="layui-btn" key="set-mine" lay-filter="*" lay-submit reload="true"
                    alert="true">确认修改
            </button>
        </div>
    </form>
</div>
```
