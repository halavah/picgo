# Part01-集成Shiro实现博客详情-收藏文章

```text
blog
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          ├─shiro
│      │          │      ShiroConfig.java
│      │          │
│      │          ├─controller
│      │          │      BaseController.java
│      │          │      PostController.java
│      │          │
│      │          ├─shiro
│      │          │      AuthFilter.java
```

## 1.1 博客详情：收藏文章【判断用户是否收藏了文章】

- `PostController.java` ：控制层，【判断用户是否收藏了文章】

```java
@Controller
public class PostController extends BaseController {
    /**
     * 详情detail：判断用户是否收藏了文章
     */
    @ResponseBody
    @PostMapping("/collection/find/")
    public Result collectionFind(Long pid) {
        int count = collectionService.count(new QueryWrapper<UserCollection>()
                .eq("user_id", getProfileId())
                .eq("post_id", pid)
        );
        //【/res/mods/jie.js】源码可知，异步渲染（layui.cache.user.uid != -1时，会调用/collection/find/接口）
        //【/res/mods/jie.js】源码可知，异步渲染（res.data.collection ? '取消收藏' : '收藏'），count > 0 为true时，则res.data.collection也为true
        return Result.success(MapUtil.of("collection", count > 0));
    }
}
```

## 1.2 博客详情：收藏文章【加入收藏】

- `PostController.java` ：控制层，【加入收藏】

```java
@Controller
public class PostController extends BaseController {
    /**
     * 详情detail：【加入收藏】文章
     */
    @ResponseBody
    @PostMapping("/collection/add/")
    public Result collectionAdd(Long pid) {
        Post post = postService.getById(pid);

        //文章是否被删除
        //如果【post != null】为true，则直接跳过该条语句；否则为false，则报异常【java.lang.IllegalArgumentException: 改帖子已被删除】
        //等价写法【if (post == null) return Result.fail("该帖子已被删除");】
        Assert.isTrue(post != null, "该文章已被删除");

        //文章是否被收藏
        int count = collectionService.count(new QueryWrapper<UserCollection>()
                .eq("user_id", getProfileId())
                .eq("post_id", pid)
        );
        if (count > 0) {
            return Result.fail("你已经收藏");
        }

        //将该文章进行收藏
        UserCollection collection = new UserCollection();
        collection.setUserId(getProfileId());
        collection.setPostId(pid);
        collection.setCreated(new Date());
        collection.setModified(new Date());
        collection.setPostUserId(post.getUserId());
        collectionService.save(collection);

        return Result.success();
    }
}
```

## 1.3 博客详情：收藏文章【取消收藏】

- `PostController.java` ：控制层，【取消收藏】

```java
@Controller
public class PostController extends BaseController {
    /**
     * 详情detail：【取消收藏】文章
     */
    @ResponseBody
    @PostMapping("/collection/remove/")
    public Result collectionRemove(Long pid) {
        Post post = postService.getById(pid);

        //文章是否被删除
        Assert.isTrue(post != null, "该文章已被删除");

        //将该文章进行删除
        collectionService.remove(new QueryWrapper<UserCollection>()
                .eq("user_id", getProfileId())
                .eq("post_id", pid));

        return Result.success();
    }
}
```

## 1.4 其他：Shiro自定义过滤器【判断请求是否是Ajax请求，还是Web请求】

- 场景：如果用户退出登录后，点击【收藏文章】，报错【请求异常，请重试】，如何弹窗提示【请先登录！】
- 解决：Shiro 自定义过滤器，重写 UserFilter 父类中的 redirectToLogin() 方法
- `AuthFilter.java` ：过滤器，判断请求是否是 Ajax 请求，还是 Web 请求

```java
public class AuthFilter extends UserFilter {

    @Override
    protected void redirectToLogin(ServletRequest request, ServletResponse response) throws IOException {

        /**
         * Ajax请求：通过对request字段的处理，来判断如果为Ajax请求，则设置response返回一段Json请求，并弹窗提示【请先登录！】
         */
        HttpServletRequest httpServletRequest = (HttpServletRequest) request;
        //通过“X-Requested-With”来确定“该请求是一个Ajax请求”
        String header = httpServletRequest.getHeader("X-Requested-With");
        if(header != null  && "XMLHttpRequest".equals(header)) {
            //isAuthenticated()：如果此主题/用户在当前会话期间通过提供与系统已知的凭据匹配的有效凭据来证明了自己的身份，则返回true否则返回false
            boolean authenticated = SecurityUtils.getSubject().isAuthenticated();
            //如果!authenticated = true，则将resp设置为“返回一段Json数据”，Result.fail("请先登录！")会触发【弹窗】显示【请先登录！】
            if(!authenticated) {
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().print(JSONUtil.toJsonStr(Result.fail("请先登录！")));
            }
        } else {

            /**
             * Web请求，则重定向到【登录页面】，直接super.父类方法，无需对request、response进行处理
             */
            super.redirectToLogin(request, response);
        }
    }
}
```

- `ShiroConfig.java` ：配置类，安全管理器、拦截器链、自定义过滤器

```java
/**
 * Shiro配置类：安全管理器、拦截器链、自定义过滤器
 */
@Slf4j
@Configuration
public class ShiroConfig {

    /**
     * 安全管理器
     */
    @Bean
    public SecurityManager securityManager(AccountRealm accountRealm){
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

        // 配置Shiro自定义过滤器：判断请求是否是Ajax请求，还是Web请求
        filterFactoryBean.setFilters(MapUtil.of("auth", authFilter()));

        // 配置过滤链定义图：未登录的情况下，访问/login、/user/home页面，自动跳转登录页面进行认证
        Map<String, String> hashMap = new LinkedHashMap<>();
        hashMap.put("/res/**", "anon");

        hashMap.put("/user/home", "auth");
        hashMap.put("/user/set", "auth");
        hashMap.put("/user/upload", "auth");

        hashMap.put("/user/index", "auth");
        hashMap.put("/user/public", "auth");
        hashMap.put("/user/collection", "auth");
        hashMap.put("/user/mess", "auth");
        hashMap.put("/msg/remove/", "auth");
        hashMap.put("/message/nums/", "auth");

        hashMap.put("/collection/remove/", "auth");
        hashMap.put("/collection/find/", "auth");
        hashMap.put("/collection/add/", "auth");

        hashMap.put("/post/edit", "auth");
        hashMap.put("/post/submit", "auth");
        hashMap.put("/post/delete", "auth");
        hashMap.put("/post/reply/", "auth");

        hashMap.put("/websocket", "anon");
        hashMap.put("/login", "anon");
        filterFactoryBean.setFilterChainDefinitionMap(hashMap);

        return filterFactoryBean;
    }

    /**
     * Shiro自定义过滤器：判断请求是否是Ajax请求，还是Web请求
     */
    @Bean
    public AuthFilter authFilter() {
        return new AuthFilter();
    }
}
```

- `static/res/mods/index.js` ：源码可知，如果 status 为 0 ，则代表登录成功；status 为 -1，则代表登录失败，并弹窗显示 msg 内容

```javascript
//Ajax
json: function (url, data, success, options) {
    var that = this, type = typeof data === 'function';

    if (type) {
        options = success
        success = data;
        data = {};
    }

    options = options || {};

    return $.ajax({
        type: options.type || 'post',
        dataType: options.dataType || 'json',
        data: data,
        url: url,
        success: function (res) {
            if (res.status === 0) {
                success && success(res);
            } else {
                layer.msg(res.msg || res.code, {shift: 6});     //弹窗显示【返回的"msg"内容】
                options.error && options.error();
            }
        }, error: function (e) {
            layer.msg('请求异常，请重试', {shift: 6});
            options.error && options.error(e);
        }
    });
}
```
