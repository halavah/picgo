# Part01-集成Kaptcha实现用户注册

```text
blog
│  pom.xml
│
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          ├─common
│      │          │  └─lang
│      │          │         Result.java
│      │          │
│      │          ├─config
│      │          │      kaptchaConfig.java
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
│      │          ├─utils
│      │          │      ValidationUtil.java
│      │
│      └─resources
│          ├─templates
│          │  ├─auth
│          │  │     reg.ftl
│          │  │     login.ftl
│          │  └─inc
│          │        header.ftl
```

## 1.1 集成 Kaptcha 环境

- `pom.xml` ：项目依赖，【Hutool-captcha、Google Kaptcha（本次选用）】

```xml
<dependencies>
    <!--图片验证码：Hutool-captcha、Google Kaptcha（本次选用）-->
    <dependency>
        <groupId>com.github.axet</groupId>
        <artifactId>kaptcha</artifactId>
        <version>0.0.9</version>
    </dependency>
</dependencies>
```

## 1.2 个人用户的【注册】：简易页面搭建

- `AuthController.java` ：控制层

```java
@Controller
public class AuthController extends BaseController {
    /**
     * 登录
     */
    @GetMapping("/login")
    public String login() {
        return "/auth/login";
    }

    /**
     * 注册
     */
    @GetMapping("/register")
    public String register() {
        return "/auth/reg";
    }
}
```

- `header.ftl` ：模板引擎

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
            <li class="layui-nav-item">
                <a class="iconfont icon-touxiang layui-hide-xs" href="user/login.html"></a>
            </li>
            <li class="layui-nav-item">
                <a href="/login">登入</a>
            </li>
            <li class="layui-nav-item">
                <a href="/register">注册</a>
            </li>
        </ul>
    </div>
</div>
```

- `login.ftl` ：模板引擎

```injectedfreemarker
<#--超链接：登入、注册-->
<ul class="layui-tab-title">
    <li><a href="/login">登入</a></li>
    <li class="layui-this">注册</li>
</ul>
```

- `reg.ftl` ：模板引擎

```injectedfreemarker
<#--超链接：登入、注册-->
<ul class="layui-tab-title">
    <li class="layui-this">登入</li>
    <li><a href="/register">注册</a></li>
</ul>
```

## 1.3 个人用户的【注册】：Kaptcha 图片验证码

- `kaptchaConfig.java` ：配置类，【配置验证码】

```java
/**
 * kaptcha 图片验证码配置类
 */
@Configuration
public class kaptchaConfig {

    @Bean
    public DefaultKaptcha producer () {
        Properties propertis = new Properties();
        //无边框
        propertis.put("kaptcha.border", "no");
        //高度
        propertis.put("kaptcha.image.height", "38");
        //长度
        propertis.put("kaptcha.image.width", "150");
        //字体颜色
        propertis.put("kaptcha.textproducer.font.color", "black");
        //字体大小
        propertis.put("kaptcha.textproducer.font.size", "32");
        Config config = new Config(propertis);
        DefaultKaptcha defaultKaptcha = new DefaultKaptcha();
        defaultKaptcha.setConfig(config);
        return defaultKaptcha;
    }
}
```

- `AuthController.java` ：控制层，【生成验证码】

```java
@Controller
public class AuthController extends BaseController {

    private static final String KAPTCHA_SESSION_KEY = "KAPTCHA_SESSION_KEY";

    @Autowired
    Producer producer;

    /**
     * 图片验证码
     */
    @GetMapping("/capthca.jpg")
    public void kaptcha(HttpServletResponse resp) throws IOException {
        // 1.生成text、image
        String text = producer.createText();
        BufferedImage image = producer.createImage(text);
        // 2.校验操作，利用session机制对text进行校验（经过测试，ImageIO输出前，必须完成req、resp请求）
        req.getSession().setAttribute("KAPTCHA_SESSION_KEY", text);
        // 3.通过resp设置Header、ContextType（经过测试，图片ContextType必须为"image/jpeg"，而非"image/jpg"）
        resp.setHeader("Cache-Control", "no-store, no-cache");
        resp.setContentType("text/html; charset=UTF-8");
        resp.setContentType("image/jpeg");
        // 4.通过ImageIO输出image
        ServletOutputStream outputStream = resp.getOutputStream();
        ImageIO.write(image, "jpg", outputStream);
    }
}
```

- `reg.ftl` ：模板引擎，【使用验证码】

```injectedfreemarker
<#--5.图片验证码-->
<div class="layui-form-item">
    <label for="L_vercode" class="layui-form-label">验证码</label>
    <div class="layui-input-inline">
        <input type="text" id="L_vercode" name="vercode" required lay-verify="required"
               placeholder="请回答后面的问题" autocomplete="off" class="layui-input">
    </div>
    <#--图片验证码-->
    <div class="">
        <img id="capthca" src="/capthca.jpg">
    </div>
</div>
```

## 1.4 个人用户的【注册】：提交表单后，自己跳转【/login】登录页面

- `/res/mods/index.js` ：源码可知，【lay-submit】此处默认【表单跳转】alert="true"，则会跳转【action 属性中的值】

```javascript
//表单提交
  form.on('submit(*)', function(data){
    var action = $(data.form).attr('action'), button = $(data.elem);
    fly.json(action, data.field, function(res){
      var end = function(){
        //action属性：跳转路径
        if(res.action){
          location.href = res.action;
        }

        // else {
        //   fly.form[action||button.attr('key')](data.field, data.form);
        // }
      };
      if(res.status == 0){
        button.attr('alert') ? layer.alert(res.msg, {
          icon: 1,
          time: 10*1000,
          end: end
        }) : end();
      }
    });
    return false;
  });
```

- `reg.ftl` ：模板引擎

```injectedfreemarker
<#--6.注册-->
<div class="layui-form-item">
    <#--通过阅读/res/mods/index.js源码可知，【lay-submit】此处默认【表单提交】对应的链接为”文件名“，即【/register】-->
    <#--通过阅读/res/mods/index.js源码可知，【lay-submit】此处默认【表单跳转】alert="true"，则会跳转【action属性中的值】-->
    <button class="layui-btn" lay-filter="*" lay-submit alert="true">立即注册</button>
</div>
```

- `Result.java` ：实体类

```java
@Data
public class Result implements Serializable {
    // 操作状态：0成功，-1失败
    private int status;

    // 携带msg
    private String msg;

    // 携带data
    private Object data;

    // 跳转页面：【lay-submit】默认提交时，通过阅读/res/mods/index.js源码可知，默认跳转【location.href = res.action;】，即action对应的位置
    private String action;

    /**
     * 操作状态：0成功，-1失败
     */
    public static Result success(String msg, Object data) {
        Result result = new Result();
        result.status = 0;
        result.msg = msg;
        result.data = data;
        return result;
    }

    public static Result success() {
        return Result.success("操作成功", null);
    }

    public static Result success(Object data) {
        return Result.success("操作成功", data);
    }

    /**
     * 操作状态：0成功，-1失败
     */
    public static Result fail(String msg) {
        Result result = new Result();
        result.status = -1;
        result.data = null;
        result.msg = msg;
        return result;
    }

    /**
     * 跳转页面
     */
    public Result action(String action){
        this.action = action;
        return this;
    }
}
```

- `ValidationUtil.java` ：工具类

```java
/**
 * ValidationUtil 工具类
 */
@Component
public class ValidationUtil {

    /**
     * 开启快速结束模式 failFast (true)
     */
    private static Validator validator = Validation.byProvider(HibernateValidator.class).configure().failFast(false).buildValidatorFactory().getValidator();
    /**
     * 校验对象
     *
     * @param t bean
     * @param groups 校验组
     * @return ValidResult
     */
    public static <T> ValidResult validateBean(T t,Class<?>...groups) {
        ValidResult result = new ValidationUtil().new ValidResult();
        Set<ConstraintViolation<T>> violationSet = validator.validate(t,groups);
        boolean hasError = violationSet != null && violationSet.size() > 0;
        result.setHasErrors(hasError);
        if (hasError) {
            for (ConstraintViolation<T> violation : violationSet) {
                result.addError(violation.getPropertyPath().toString(), violation.getMessage());
            }
        }
        return result;
    }
    /**
     * 校验bean的某一个属性
     *
     * @param obj          bean
     * @param propertyName 属性名称
     * @return ValidResult
     */
    public static <T> ValidResult validateProperty(T obj, String propertyName) {
        ValidResult result = new ValidationUtil().new ValidResult();
        Set<ConstraintViolation<T>> violationSet = validator.validateProperty(obj, propertyName);
        boolean hasError = violationSet != null && violationSet.size() > 0;
        result.setHasErrors(hasError);
        if (hasError) {
            for (ConstraintViolation<T> violation : violationSet) {
                result.addError(propertyName, violation.getMessage());
            }
        }
        return result;
    }
    /**
     * 校验结果类
     */
    @Data
    public class ValidResult {

        /**
         * 是否有错误
         */
        private boolean hasErrors;

        /**
         * 错误信息
         */
        private List<ErrorMessage> errors;

        public ValidResult() {
            this.errors = new ArrayList<>();
        }
        public boolean hasErrors() {
            return hasErrors;
        }

        public void setHasErrors(boolean hasErrors) {
            this.hasErrors = hasErrors;
        }

        /**
         * 获取所有验证信息
         * @return 集合形式
         */
        public List<ErrorMessage> getAllErrors() {
            return errors;
        }
        /**
         * 获取所有验证信息
         * @return 字符串形式
         */
        public String getErrors(){
            StringBuilder sb = new StringBuilder();
            for (ErrorMessage error : errors) {
                sb.append(error.getPropertyPath()).append(":").append(error.getMessage()).append(" ");
            }
            return sb.toString();
        }

        public void addError(String propertyName, String message) {
            this.errors.add(new ErrorMessage(propertyName, message));
        }
    }

    @Data
    public class ErrorMessage {

        private String propertyPath;

        private String message;

        public ErrorMessage() {
        }

        public ErrorMessage(String propertyPath, String message) {
            this.propertyPath = propertyPath;
            this.message = message;
        }
    }

}
```

- `AuthController.java` ：控制层

```java
@Controller
public class AuthController extends BaseController {

    /**
     * 注册：校验
     */
    @ResponseBody
    @PostMapping("/register")
    public Result doRegister(User user, String repass, String vercode) {
        // 使用ValidationUtil工具类，校验【输入是否错误】
        ValidationUtil.ValidResult validResult = ValidationUtil.validateBean(user);
        if(validResult.hasErrors()) {
            return Result.fail(validResult.getErrors());
        }

        // 校验【密码是否一致】
        if(!user.getPassword().equals(repass)) {
            return Result.fail("两次输入密码不相同");
        }

        // 校验【验证码是否正确】：从session中获取KAPTCHA_SESSION_KEY，即正确的验证码【text】
        String kaptcha_session_key = (String) req.getSession().getAttribute(KAPTCHA_SESSION_KEY);
        System.out.println(kaptcha_session_key);
        if(vercode == null || !vercode.equalsIgnoreCase(kaptcha_session_key)) {
            return Result.fail("验证码输入不正确");
        }

        // 完成注册
        Result result = userService.register(user);
        // 如果校验成功，则完成注册，跳转/login页面
        return result.action("/login");
    }
}
```

- `UserServiceImpl.java` ：业务层实现

```java
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Override
    public Result register(User user) {
        /**
         * 查询【用户名或邮箱】是否被占用
         */
        int count = this.count(new QueryWrapper<User>()
                .eq("email", user.getEmail())
                .or()
                .eq("username", user.getUsername())
        );
        if (count > 0) {
            return Result.fail("用户名或邮箱已被占用");
        }

        /**
         * 设置【新注册用户】中属性：
         *
         * 1.防止前端对传来数据进行伪造，因此，重新获取name、password、email重要属性
         * 2.对其他属性进行默认额外处理，比如，Avatar、Created、Point、VipLevel、CommentCount、PostCount、Gender
         */
        User temp = new User();
        temp.setUsername(user.getUsername());
        temp.setPassword(SecureUtil.md5(user.getPassword()));//SecureUtil使用md5对password加密
        temp.setEmail(user.getEmail());
        temp.setAvatar("/res/images/avatar/default.jpgjpg");
        temp.setCreated(new Date());
        temp.setPoint(0);
        temp.setVipLevel(0);
        temp.setCommentCount(0);
        temp.setPostCount(0);
        temp.setGender("0");
        this.save(temp);
        return Result.success();
    }
}
```
