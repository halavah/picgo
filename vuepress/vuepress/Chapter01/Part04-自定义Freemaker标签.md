# Part04-自定义Freemaker标签

```text
blog
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          ├─common
│      │          │  └─templates
│      │          │         DirectiveHandler.java
│      │          │         TemplateDirective.java
│      │          │         TemplateModelUtils.java
│      │          │
│      │          ├─config
│      │          │      FreemarkerConfig.java
│      │          │
│      │          ├─template
│      │          │      PostsTemplate.java
│      │          │      TimeAgoMethod.java
```

## 4.1 方式一：实现TemplateDirectiveModel接口，重写 excute 方法

- `TemplateDirectiveModel.java` ：配置类

```java
public interface TemplateDirectiveModel extends TemplateModel {
  public void execute(Environment env, Map params, TemplateModel[] loopVars, TemplateDirectiveBody body) throws TemplateException, IOException;
}
```

上述方法的参数说明：

- env：系统环境变量，通常用它来输出相关内容，如 Writer out = env.getOut()。
- params：自定义标签传过来的对象，其 key = 自定义标签的参数名，value 值是 TemplateModel 类型，而 TemplateModel 是一个接口类型，通常我们都使用 TemplateScalarModel 接口来替代它获取一个 String 值，如 TemplateScalarModel.getAsString(); 当然还有其它常用的替代接口，如 TemplateNumberModel 获取 number，TemplateHashModel 等。
- loopVars 循环替代变量。
- body 用于处理自定义标签中的内容，如 <@myDirective> 将要被处理的内容；当标签是<@myDirective /> 格式时，body=null。

## 4.2 方式二：采用 mblog 项目对该 TemplateDirectiveModel 接口进行封装

- 实现逻辑：
  - 实现 TemplateDirectiveModel 接口较为复杂，故我们可以直接使用 mblog 项目中已经封装好的类：org.myslayers.common.templates.DirectiveHandler、TemplateDirective、TemplateModelUtils；
  - 其中，我们只需要重写 TemplateDirective 类中的 getName（）和 excute（DirectiveHandler handler），本次使用 `PostsTemplate`、`TimeAgoMethod` 进行开发使用；
  - 最后，使用 `FreemarkerConfig` 类在 Springboot 中对 PostsTemplate、TimeAgoMethod 进行标签的声明`<timeAgo></timeAgo>`、`<details></details>`。
- `DirectiveHandler.java`：配置类，【配置标签】

```java
/**
 * mblog：开发标签
 */
public class DirectiveHandler {

    private Environment env;
    private Map<String, TemplateModel> parameters;
    private TemplateModel[] loopVars;
    private TemplateDirectiveBody body;
    private Environment.Namespace namespace;

    /**
     * 构建 DirectiveHandler
     *
     * @param env        系统环境变量，通常用它来输出相关内容，如Writer out = env.getOut()。
     * @param parameters 自定义标签传过来的对象
     * @param loopVars   循环替代变量
     * @param body       用于处理自定义标签中的内容，如<@myDirective>将要被处理的内容</@myDirective>；当标签是<@myDirective
     *                   />格式时，body=null。
     */
    public DirectiveHandler(Environment env, Map<String, TemplateModel> parameters,
        TemplateModel[] loopVars,
        TemplateDirectiveBody body) {
        this.env = env;
        this.loopVars = loopVars;
        this.parameters = parameters;
        this.body = body;
        this.namespace = env.getCurrentNamespace();
    }

    public void render() throws IOException, TemplateException {
        Assert.notNull(body, "must have template directive body");
        body.render(env.getOut());
    }

    public void renderString(String text) throws Exception {
        StringWriter writer = new StringWriter();
        writer.append(text);
        env.getOut().write(text);
    }

    public DirectiveHandler put(String key, Object value) throws TemplateModelException {
        namespace.put(key, wrap(value));
        return this;
    }

    public String getString(String name) throws TemplateModelException {
        return TemplateModelUtils.converString(getModel(name));
    }

    public Integer getInteger(String name) throws TemplateModelException {
        return TemplateModelUtils.converInteger(getModel(name));
    }

    public Short getShort(String name) throws TemplateModelException {
        return TemplateModelUtils.converShort(getModel(name));
    }

    public Long getLong(String name) throws TemplateModelException {
        return TemplateModelUtils.converLong(getModel(name));
    }

    public Double getDouble(String name) throws TemplateModelException {
        return TemplateModelUtils.converDouble(getModel(name));
    }

    public String[] getStringArray(String name) throws TemplateModelException {
        return TemplateModelUtils.converStringArray(getModel(name));
    }

    public Boolean getBoolean(String name) throws TemplateModelException {
        return TemplateModelUtils.converBoolean(getModel(name));
    }

    public Date getDate(String name) throws TemplateModelException {
        return TemplateModelUtils.converDate(getModel(name));
    }

    public String getString(String name, String defaultValue) throws Exception {
        String result = getString(name);
        return null == result ? defaultValue : result;
    }

    public Integer getInteger(String name, int defaultValue) throws Exception {
        Integer result = getInteger(name);
        return null == result ? defaultValue : result;
    }

    public Long getLong(String name, long defaultValue) throws Exception {
        Long result = getLong(name);
        return null == result ? defaultValue : result;
    }


    public String getContextPath() {
        String ret = null;
        try {
            ret = TemplateModelUtils.converString(getEnvModel("base"));
        } catch (TemplateModelException e) {
        }
        return ret;
    }

    /**
     * 包装对象
     */
    public TemplateModel wrap(Object object) throws TemplateModelException {
        return env.getObjectWrapper().wrap(object);
    }

    /**
     * 获取局部变量
     */
    public TemplateModel getEnvModel(String name) throws TemplateModelException {
        return env.getVariable(name);
    }

    public void write(String text) throws IOException {
        env.getOut().write(text);
    }

    private TemplateModel getModel(String name) {
        return parameters.get(name);
    }

    public abstract static class BaseMethod implements TemplateMethodModelEx {

        public String getString(List<TemplateModel> arguments, int index)
            throws TemplateModelException {
            return TemplateModelUtils.converString(getModel(arguments, index));
        }

        public Integer getInteger(List<TemplateModel> arguments, int index)
            throws TemplateModelException {
            return TemplateModelUtils.converInteger(getModel(arguments, index));
        }

        public Long getLong(List<TemplateModel> arguments, int index)
            throws TemplateModelException {
            return TemplateModelUtils.converLong(getModel(arguments, index));
        }

        public Date getDate(List<TemplateModel> arguments, int index)
            throws TemplateModelException {
            return TemplateModelUtils.converDate(getModel(arguments, index));
        }

        public TemplateModel getModel(List<TemplateModel> arguments, int index) {
            if (index < arguments.size()) {
                return arguments.get(index);
            }
            return null;
        }
    }
}
```

- `TemplateDirective.java` ：配置类，【配置标签】

```java
/**
 * mblog：开发标签
 */
public abstract class TemplateDirective implements TemplateDirectiveModel {

    protected static String RESULT = "result";
    protected static String RESULTS = "results";

    @Override
    public void execute(Environment env, Map parameters,
        TemplateModel[] loopVars, TemplateDirectiveBody body)
        throws TemplateException, IOException {
        try {
            execute(new DirectiveHandler(env, parameters, loopVars, body));
        } catch (IOException e) {
            throw e;
        } catch (Exception e) {
            throw new TemplateException(e, env);
        }
    }

    abstract public String getName();

    abstract public void execute(DirectiveHandler handler) throws Exception;

}
```

- `TemplateModelUtils.java` ：配置类，【配置标签】

```java
/**
 * mblog：开发标签（Freemarker 模型工具类）
 */
public class TemplateModelUtils {

    public static final DateFormat FULL_DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    public static final int FULL_DATE_LENGTH = 19;

    public static final DateFormat SHORT_DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd");
    public static final int SHORT_DATE_LENGTH = 10;

    public static String converString(TemplateModel model) throws TemplateModelException {
        if (null != model) {
            if (model instanceof TemplateScalarModel) {
                return ((TemplateScalarModel) model).getAsString();
            } else if ((model instanceof TemplateNumberModel)) {
                return ((TemplateNumberModel) model).getAsNumber().toString();
            }
        }
        return null;
    }

    public static TemplateHashModel converMap(TemplateModel model) throws TemplateModelException {
        if (null != model) {
            if (model instanceof TemplateHashModelEx) {
                return (TemplateHashModelEx) model;
            } else if (model instanceof TemplateHashModel) {
                return (TemplateHashModel) model;
            }
        }
        return null;
    }

    public static Integer converInteger(TemplateModel model) throws TemplateModelException {
        if (null != model) {
            if (model instanceof TemplateNumberModel) {
                return ((TemplateNumberModel) model).getAsNumber().intValue();
            } else if (model instanceof TemplateScalarModel) {
                String s = ((TemplateScalarModel) model).getAsString();
                if (isNotBlank(s)) {
                    try {
                        return Integer.parseInt(s);
                    } catch (NumberFormatException e) {
                    }
                }
            }
        }
        return null;
    }

    public static Short converShort(TemplateModel model) throws TemplateModelException {
        if (null != model) {
            if (model instanceof TemplateNumberModel) {
                return ((TemplateNumberModel) model).getAsNumber().shortValue();
            } else if (model instanceof TemplateScalarModel) {
                String s = ((TemplateScalarModel) model).getAsString();
                if (isNotBlank(s)) {
                    try {
                        return Short.parseShort(s);
                    } catch (NumberFormatException e) {
                    }
                }
            }
        }
        return null;
    }

    public static Long converLong(TemplateModel model) throws TemplateModelException {
        if (null != model) {
            if (model instanceof TemplateNumberModel) {
                return ((TemplateNumberModel) model).getAsNumber().longValue();
            } else if (model instanceof TemplateScalarModel) {
                String s = ((TemplateScalarModel) model).getAsString();
                if (isNotBlank(s)) {
                    try {
                        return Long.parseLong(s);
                    } catch (NumberFormatException e) {
                    }
                }
            }
        }
        return null;
    }

    public static Double converDouble(TemplateModel model) throws TemplateModelException {
        if (null != model) {
            if (model instanceof TemplateNumberModel) {
                return ((TemplateNumberModel) model).getAsNumber().doubleValue();
            } else if (model instanceof TemplateScalarModel) {
                String s = ((TemplateScalarModel) model).getAsString();
                if (isNotBlank(s)) {
                    try {
                        return Double.parseDouble(s);
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        }
        return null;
    }

    public static String[] converStringArray(TemplateModel model) throws TemplateModelException {
        if (model instanceof TemplateSequenceModel) {
            TemplateSequenceModel smodel = (TemplateSequenceModel) model;
            String[] values = new String[smodel.size()];
            for (int i = 0; i < smodel.size(); i++) {
                values[i] = converString(smodel.get(i));
            }
            return values;
        } else {
            String str = converString(model);
            if (isNotBlank(str)) {
                return split(str, ',');
            }
        }
        return null;
    }

    public static Boolean converBoolean(TemplateModel model) throws TemplateModelException {
        if (null != model) {
            if (model instanceof TemplateBooleanModel) {
                return ((TemplateBooleanModel) model).getAsBoolean();
            } else if (model instanceof TemplateNumberModel) {
                return !(0 == ((TemplateNumberModel) model).getAsNumber().intValue());
            } else if (model instanceof TemplateScalarModel) {
                String temp = ((TemplateScalarModel) model).getAsString();
                if (isNotBlank(temp)) {
                    return Boolean.valueOf(temp);
                }
            }
        }
        return null;
    }

    public static Date converDate(TemplateModel model) throws TemplateModelException {
        if (null != model) {
            if (model instanceof TemplateDateModel) {
                return ((TemplateDateModel) model).getAsDate();
            } else if (model instanceof TemplateScalarModel) {
                String temp = trimToEmpty(((TemplateScalarModel) model).getAsString());
                return parseDate(temp);
            }
        }
        return null;
    }

    public static Date parseDate(String date) {

        Date ret = null;
        try {
            if (FULL_DATE_LENGTH == date.length()) {
                ret = FULL_DATE_FORMAT.parse(date);
            } else if (SHORT_DATE_LENGTH == date.length()) {
                ret = SHORT_DATE_FORMAT.parse(date);
            }
        } catch (ParseException e) {
        }
        return ret;
    }
}
```

- `TimeAgoMethod.java` ：工具类，【开发标签】

```java
@Component
public class TimeAgoMethod extends DirectiveHandler.BaseMethod {

    private static final long ONE_MINUTE = 60000L;
    private static final long ONE_HOUR = 3600000L;
    private static final long ONE_DAY = 86400000L;
    private static final long ONE_WEEK = 604800000L;

    private static final String ONE_SECOND_AGO = "秒前";
    private static final String ONE_MINUTE_AGO = "分钟前";
    private static final String ONE_HOUR_AGO = "小时前";
    private static final String ONE_DAY_AGO = "天前";
    private static final String ONE_MONTH_AGO = "月前";
    private static final String ONE_YEAR_AGO = "年前";
    private static final String ONE_UNKNOWN = "未知";

    @Override
    public Object exec(List arguments) throws TemplateModelException {
        Date time = getDate(arguments, 0);
        return format(time);
    }

    public static String format(Date date) {
        if (null == date) {
            return ONE_UNKNOWN;
        }
        long delta = new Date().getTime() - date.getTime();
        if (delta < 1L * ONE_MINUTE) {
            long seconds = toSeconds(delta);
            return (seconds <= 0 ? 1 : seconds) + ONE_SECOND_AGO;
        }
        if (delta < 45L * ONE_MINUTE) {
            long minutes = toMinutes(delta);
            return (minutes <= 0 ? 1 : minutes) + ONE_MINUTE_AGO;
        }
        if (delta < 24L * ONE_HOUR) {
            long hours = toHours(delta);
            return (hours <= 0 ? 1 : hours) + ONE_HOUR_AGO;
        }
        if (delta < 48L * ONE_HOUR) {
            return "昨天";
        }
        if (delta < 30L * ONE_DAY) {
            long days = toDays(delta);
            return (days <= 0 ? 1 : days) + ONE_DAY_AGO;
        }
        if (delta < 12L * 4L * ONE_WEEK) {
            long months = toMonths(delta);
            return (months <= 0 ? 1 : months) + ONE_MONTH_AGO;
        } else {
            long years = toYears(delta);
            return (years <= 0 ? 1 : years) + ONE_YEAR_AGO;
        }
    }

    private static long toSeconds(long date) {
        return date / 1000L;
    }

    private static long toMinutes(long date) {
        return toSeconds(date) / 60L;
    }

    private static long toHours(long date) {
        return toMinutes(date) / 60L;
    }

    private static long toDays(long date) {
        return toHours(date) / 24L;
    }

    private static long toMonths(long date) {
        return toDays(date) / 30L;
    }

    private static long toYears(long date) {
        return toMonths(date) / 365L;
    }
}
```

- `PostsTemplate.java` ：工具类，【开发标签】

```java
/**
 * 文章具体详情
 */
@Component
public class PostsTemplate extends TemplateDirective {

    @Autowired
    PostService postService;

    @Override
    public String getName() {
        return "details";
    }

    /**
     * 分页外（置顶） -> 默认分页的基本信息
     */
    @Override
    public void execute(DirectiveHandler handler) throws Exception {
        // 置顶等级level
        Integer level = handler.getInteger("level", 1);
        // 起始页码pn
        Integer pn = handler.getInteger("pn", 1);
        // 页面大小size
        Integer size = handler.getInteger("size", 2);
        // 分类信息categoryId
        Long categoryId = handler.getLong("categoryId");

        /**
         * 多条（post实体类、PostVo实体类）：分页集合results：
         *   1.封装level、pn、size、categoryId
         *   2.注册为“posts”函数：默认调用该函数时，自动查询 -> 分页集合results
         */
        IPage<PostVo> page = postService
            .selectPosts(new Page(pn, size), categoryId, null, level, null, "created");
        handler.put(RESULTS, page).render();
    }
}
```

- `FreemarkerConfig.java` ：配置类，【注册标签】

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
    }
}
```
