# Part02-集成Shiro实现用户登录

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
│      │          │      ShiroConfig.java
│      │          │      FreemarkerConfig
│      │          │
│      │          ├─controller
│      │          │      BaseController.java
│      │          │      AuthController.java
│      │          │
│      │          ├─service
│      │          │  │  UserService.java
│      │          │  │
│      │          │  └─impl
│      │          │         UserServiceImpl.java
│      │          ├
│      │          ├─shiro
│      │          │      AccountProfile.java
│      │          │      AccountRealm.java
│      │
│      └─resources
│          ├─templates
│          │  ├─auth
│          │  │     reg.ftl
│          │  │
│          │  └─inc
│          │        header.ftl
```

## 2.1 集成 Shiro 环境

- `pom.xml` ：项目依赖，【shiro-spring 权限、shiro-freemarker-tags 标签】

```xml
<dependencies>
    <!--shiro权限框架-->
    <dependency>
        <groupId>org.apache.shiro</groupId>
        <artifactId>shiro-spring</artifactId>
        <version>1.4.0</version>
    </dependency>
    <!--shiro-freemarker-tags标签-->
    <dependency>
        <groupId>net.mingsoft</groupId>
        <artifactId>shiro-freemarker-tags</artifactId>
        <version>0.1</version>
    </dependency>
</dependencies>
```

- `ShiroConfig.java` ：配置类，【安全管理器、拦截器链】

```java
/**
 * Shiro配置类：安全管理器、拦截器链
 */
@Slf4j
@Configuration
public class ShiroConfig {
    /**
     * 安全管理器
     */
    @Bean
    public SecurityManager securityManager(AccountRealm accountRealm) {
        DefaultWebSecurityManager securityManager = new DefaultWebSecurityManager();
        securityManager.setRealm(accountRealm);
        log.info("------------------>securityManager注入成功");
        return securityManager;
    }

    /**
     * 拦截器链
     */
    @Bean
    public ShiroFilterFactoryBean shiroFilterFactoryBean(SecurityManager securityManager) {
        ShiroFilterFactoryBean filterFactoryBean = new ShiroFilterFactoryBean();
        // 配置安全管理器
        filterFactoryBean.setSecurityManager(securityManager);

        // 配置登录的url
        filterFactoryBean.setLoginUrl("/login");

        // 配置登录成功的url
        filterFactoryBean.setSuccessUrl("/user/center");

        // 配置未授权跳转页面
        filterFactoryBean.setUnauthorizedUrl("/error/403");

        // 配置过滤链定义图
        Map<String, String> hashMap = new LinkedHashMap<>();
        hashMap.put("/login", "anon");
        filterFactoryBean.setFilterChainDefinitionMap(hashMap);

        return filterFactoryBean;
    }
}
```

## 2.2 个人用户的【登录】：使用 Shiro 进行 `/login` 操作

- `AuthController.java` ：控制层，【用户登录】

```java
@Controller
public class AuthController extends BaseController {
    /**
     * 登录：Shiro校验
     */
    @ResponseBody
    @PostMapping("/login")
    public Result doLogin(String email, String password) {
        /**
         * 使用hutool的StrUtil工具类，【isEmpty】字符串是否为空、【isBlank】字符串是否为空白
         */
        if (StrUtil.isEmpty(email) || StrUtil.isBlank(password)) {
            return Result.fail("邮箱或密码不能为空");
        }

        /**
         * 使用Shiro框架，生成token后进行登录
         */
        try {
            // 生成Token：根据UsernamePasswordToken参数可知，会对username、password进行token生成
            UsernamePasswordToken token = new UsernamePasswordToken(email, SecureUtil.md5(password));
            // 使用Token：使用该token进行登录
            SecurityUtils.getSubject().login(token);
        } catch (AuthenticationException e) {
            // 使用Shiro框架中封装好的常见错误进行【异常处理】
            if (e instanceof UnknownAccountException) {
                return Result.fail("用户不存在");
            } else if (e instanceof LockedAccountException) {
                return Result.fail("用户被禁用");
            } else if (e instanceof IncorrectCredentialsException) {
                return Result.fail("密码错误");
            } else {
                return Result.fail("用户认证失败");
            }
        }

        /**
         * 如果登录成功，跳转/根页面
         */
        return Result.success().action("/");
    }
}
```

- `AccountProfile.java` ：实体类

```java
/**
 * 用户在login后，将查询后的user结果，复制一份给AccountProfile【用户信息】
 */
@Data
public class AccountProfile implements Serializable {

    private Long id;

    private String username;
    private String email;
    private String sign;

    private String avatar;
    private String gender;
    private Date created;
}
```

- `AccountRealm.java` ：过滤器，【重写父类 AuthorizingRealm 方法】

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
        return info;
    }
}
```

- `UserServiceImpl.java` ：业务层实现，【AccountRealm 根据 token 获取 username、password，并进行 login 登录，返回 AccountProfile 账户信息】

```java
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Override
    public AccountProfile login(String email, String password) {
        /**
         * 查询【用户名或邮箱】是否正确：通过【数据库中获取的username、password】与【token中获取的username、password】进行对比
         */
        User user = this.getOne(new QueryWrapper<User>().eq("email", email));
        //用户名不存在，抛出异常
        if (user == null) {
            throw new UnknownAccountException();
        }
        //用户密码不正确，抛出异常
        if (!user.getPassword().equals(password)) {
            throw new IncorrectCredentialsException();
        }
        //更新用户最后登录时间，并updateById将user写入到数据库
        user.setLasted(new Date());
        this.updateById(user);

        /**
         * 将查询后的user结果，复制一份给AccountProfile
         *
         * copyProperties(Object source, Object target) ：将source复制给target目标对象
         */
        AccountProfile profile = new AccountProfile();
        BeanUtil.copyProperties(user, profile);
        return profile;
    }
}
```

## 2.3 个人用户的【登录】：shiro-freemarker-tags 标签

- `FreemarkerConfig.java` ：配置类，【注册标签，将 shiro-freemarker-tags 注册到 Freemarker 配置类】

```java
/**
 * Freemarker配置类
 */
@Configuration
public class FreemarkerConfig {

    @Autowired
    private freemarker.template.Configuration configuration;

    @Autowired
    TimeAgoMethod timeAgoMethod;

    @Autowired
    PostsTemplate postsTemplate;

    @Autowired
    HotsTemplate hotsTemplate;

    /**
     * 注册为“timeAgo”函数：快速实现日期转换
     * 注册为“posts”函数：快速实现分页
     */
    @PostConstruct
    public void setUp() {
        configuration.setSharedVariable("timeAgo", timeAgoMethod);
        configuration.setSharedVariable("details", postsTemplate);
        configuration.setSharedVariable("hots", hotsTemplate);
        configuration.setSharedVariable("shiro", new ShiroTags()); //shiro-freemarker-tags标签 -> 声明为shiro标签
    }
}
```

- `header.ftl` ：模板引擎，【未登录的状态、登录后的状态】

```injectedfreemarker
<#--【一、导航栏】-->
<div class="fly-header layui-bg-black">
    <div class="layui-container">
        <#--1.图标-->
        <a class="fly-logo" href="/">
            <img src="/res/images/logo.png" alt="layui">
        </a>

        <#--2.登录/注册-->
        <ul class="layui-nav fly-nav-user">

            <#--未登录的状态-->
            <#--【shiro.guest】：验证当前用户是否为 “访客”，即未认证（包含未记住）的用户-->
            <@shiro.guest>
                <li class="layui-nav-item">
                    <a class="iconfont icon-touxiang layui-hide-xs" href="user/login.html"></a>
                </li>
                <li class="layui-nav-item">
                    <a href="/login">登入</a>
                </li>
                <li class="layui-nav-item">
                    <a href="/register">注册</a>
                </li>
            </@shiro.guest>

            <#--登录后的状态-->
            <#--【shiro.user】：认证通过或已记住的用户-->
            <@shiro.user>
                <li class="layui-nav-item">
                    <a class="fly-nav-avatar" href="javascript:;">
                    <#--当前用户【username】-->
                        <cite class="layui-hide-xs">
                            <@shiro.principal property="username"/>
                        </cite>
                        <i class="iconfont icon-renzheng layui-hide-xs" title="认证信息：layui 作者"></i>
                        <i class="layui-badge fly-badge-vip layui-hide-xs">SVIP</i>
                        <#--当前用户【avatar】-->
                        <img src="<@shiro.principal property="avatar" />">
                    </a>
                    <dl class="layui-nav-child">
                        <#--基本设置-->
                        <dd>
                            <a href="user/set.html">
                                <i class="layui-icon">&#xe620;</i>基本设置
                            </a>
                        </dd>
                        <#--我的消息-->
                        <dd>
                            <a href="user/message.html">
                                <i class="iconfont icon-tongzhi" style="top: 4px;"></i>我的消息
                            </a>
                        </dd>
                        <#--我的主页-->
                        <dd>
                            <a href="user/home.html">
                                <i class="layui-icon" style="margin-left: 2px; font-size: 22px;">&#xe68e;</i>我的主页
                            </a>
                        </dd>
                        <hr style="margin: 5px 0;">
                        <#--退出登录-->
                        <dd>
                            <a href="/user/logout/" style="text-align: center;">
                                退出
                            </a>
                        </dd>
                    </dl>
                </li>
            </@shiro.user>

        </ul>
    </div>
</div>
```

## 2.4 个人用户的【登录】：使用 Shiro 进行【登出】操作

- `AuthController.java` ：控制层，【用户登出】

```java
@Controller
public class AuthController extends BaseController {
    /**
     * 登出：Shiro校验
     */
    @RequestMapping("/user/logout")
    public String logout() {
        // Shiro将【当前用户】登出
        SecurityUtils.getSubject().logout();
        // 页面重定向至【根目录/】
        return "redirect:/";
    }
}
```

- `header.ftl` ：模板引擎

```injectedfreemarker
<#--退出登录-->
<dd>
    <a href="/user/logout/" style="text-align: center;">
        退出
    </a>
</dd>
```
