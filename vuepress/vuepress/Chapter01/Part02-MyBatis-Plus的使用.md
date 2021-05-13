# Part02-MyBatis-Plus的使用

```text
blog
│  pom.xml
│
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          │  CodeGenerator
│      │          │
│      │          ├─config
│      │          │      MyBatisPlusConfig.java
│      │          │
│      │          ├─service
│      │          │  │  PostService.java
│      │          │  │
│      │          │  └─impl
│      │          │         PostServiceImpl.java
│      │          │
│      │          ├─mapper
│      │          │  │  PostMapper.java
│      │          │  │
│      │          │  └─impl
│      │          │         PostMapper.xml
```

## 2.1 MP 环境

- `pom.xml` ：项目依赖，【mybatis-plus-boot-starter、p6spy】

```xml
<dependencies>
  <!--mp、druid、mysql、mp-generator（MyBatis-Plus 从 3.0.3后移除了代码生成器与模板引擎的默认依赖）、MP支持的SQL分析器-->
  <dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-boot-starter</artifactId>
    <version>3.2.0</version>
  </dependency>
  <!--        <dependency>-->
  <!--            <groupId>com.alibaba</groupId>-->
  <!--            <artifactId>druid-spring-boot-starter</artifactId>-->
  <!--            <version>1.1.10</version>-->
  <!--        </dependency>-->
  <dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-generator</artifactId>
    <version>3.2.0</version>
  </dependency>
  <dependency>
    <groupId>p6spy</groupId>
    <artifactId>p6spy</artifactId>
    <version>3.8.6</version>
  </dependency>
</dependencies>
```

- `application.yml` ：配置文件，【识别 Mapper 层】

```yaml
mybatis-plus:
  mapper-locations: classpath*:/mapper/**Mapper.xml
```

## 2.2 代码生成器

- CodeGenerator.java：项目依赖，【mybatis-plus-boot-starter、mysql-connector-java、mybatis-plus-generator、druid-spring-boot-starter、spring-boot-starter-freemarker】

```java
// 演示例子，执行 main 方法控制台输入模块表名回车自动生成对应项目目录中
public class CodeGenerator {

    /**
     * <p>
     * 读取控制台内容
     * </p>
     */
    public static String scanner(String tip) {
        Scanner scanner = new Scanner(System.in);
        StringBuilder help = new StringBuilder();
        help.append("请输入" + tip + "：");
        System.out.println(help.toString());
        if (scanner.hasNext()) {
            String ipt = scanner.next();
            if (StringUtils.isNotEmpty(ipt)) {
                return ipt;
            }
        }
        throw new MybatisPlusException("请输入正确的" + tip + "！");
    }

    public static void main(String[] args) {
        // 代码生成器
        AutoGenerator mpg = new AutoGenerator();

        // 全局配置
        GlobalConfig gc = new GlobalConfig();
        String projectPath = System.getProperty("user.dir");
        gc.setOutputDir(projectPath + "/src/main/java");
        gc.setAuthor("myslayers");
        gc.setOpen(false);
        // gc.setSwagger2(true); 实体属性 Swagger2 注解
        gc.setServiceName("%sService");
        mpg.setGlobalConfig(gc);

        // 数据源配置
        DataSourceConfig dsc = new DataSourceConfig();
        dsc.setUrl(
            "jdbc:mysql://localhost:3306/xblog?useUnicode=true&useSSL=false&characterEncoding=utf8&serverTimezone=UTC");
        // dsc.setSchemaName("public");
        dsc.setDriverName("com.mysql.jdbc.Driver");
        dsc.setUsername("root");
        dsc.setPassword("4023615");
        mpg.setDataSource(dsc);

        // 包配置
        PackageConfig pc = new PackageConfig();
        pc.setModuleName(null);
        pc.setParent("org.myslayers");
        mpg.setPackageInfo(pc);

        // 自定义配置
        InjectionConfig cfg = new InjectionConfig() {
            @Override
            public void initMap() {
                // to do nothing
            }
        };

        // 如果模板引擎是 freemarker
        String templatePath = "/templates/mapper.xml.ftl";
        // 如果模板引擎是 velocity
        // String templatePath = "/templates/mapper.xml.vm";

        // 自定义输出配置
        List<FileOutConfig> focList = new ArrayList<>();
        // 自定义配置会被优先输出
        focList.add(new FileOutConfig(templatePath) {
            @Override
            public String outputFile(TableInfo tableInfo) {
                // 自定义输出文件名 ， 如果你 Entity 设置了前后缀、此处注意 xml 的名称会跟着发生变化！！
                return projectPath + "/src/main/resources/mapper/"
                    + "/" + tableInfo.getEntityName() + "Mapper" + StringPool.DOT_XML;
            }
        });

        cfg.setFileOutConfigList(focList);
        mpg.setCfg(cfg);

        // 配置模板
        TemplateConfig templateConfig = new TemplateConfig();

        // 配置自定义输出模板
        //指定自定义模板路径，注意不要带上.ftl/.vm, 会根据使用的模板引擎自动识别
        // templateConfig.setEntity("templates/entity2.java");
        // templateConfig.setService();
        // templateConfig.setController();

        templateConfig.setXml(null);
        mpg.setTemplate(templateConfig);

        // 策略配置
        StrategyConfig strategy = new StrategyConfig();
        strategy.setNaming(NamingStrategy.underline_to_camel);
        strategy.setColumnNaming(NamingStrategy.underline_to_camel);
        // 你自己的父类实体,没有就不用设置!
        strategy.setSuperEntityClass("org.myslayers.entity.BaseEntity");
        strategy.setEntityLombokModel(true);
        strategy.setRestControllerStyle(true);
        // 你自己的父类控制器,没有就不用设置!
        strategy.setSuperControllerClass("org.myslayers.controller.BaseController");
        strategy.setInclude(scanner("表名，多个英文逗号分割").split(","));
        strategy.setSuperEntityColumns("id", "created", "modified", "status");
        strategy.setControllerMappingHyphenStyle(true);
        strategy.setTablePrefix(pc.getModuleName() + "_");
        mpg.setStrategy(strategy);
        mpg.setTemplateEngine(new FreemarkerTemplateEngine());
        mpg.execute();
    }
}
```

## 2.3 分页插件

- `MyBatisPlusConfig.java` ：配置类，【SpringBoot 的使用方式】

```java
@Configuration
@EnableTransactionManagement
@MapperScan("org.myslayers.mapper")
public class MyBatisPlusConfig {

    /**
     * 分页插件
     */
    @Bean
    public PaginationInterceptor paginationInterceptor() {
        PaginationInterceptor paginationInterceptor = new PaginationInterceptor();
        return paginationInterceptor;
    }
}
```

## 2.4 执行 SQL 分析打印

- `spy.properties` ：配置文件，【该功能依赖 p6spy 组件，其中 datasource、freemarker、mybatis-plus 的配置】

```yaml
spring:
  datasource:
    #    driver-class-name: com.mysql.cj.jdbc.Driver
    driver-class-name: com.p6spy.engine.spy.P6SpyDriver
    url: jdbc:p6spy:mysql://127.0.0.1:3306/xblog?useUnicode=true&useSSL=false&characterEncoding=utf8&serverTimezone=UTC
    username: root
    password: 123456
  freemarker:
    settings:
      classic_compatible: true
      datetime_format: yyyy-MM-dd HH:mm
      number_format: 0.##
```

- `spy.properties` ：配置文件，【p6spy 组件对应的 spy.properties 配置】

```properties
#3.2.1以下使用或者不配置
module.log=com.p6spy.engine.logging.P6LogFactory,com.p6spy.engine.outage.P6OutageFactory
# 自定义日志打印
logMessageFormat=com.baomidou.mybatisplus.extension.p6spy.P6SpyLogger
#日志输出到控制台
appender=com.baomidou.mybatisplus.extension.p6spy.StdoutLogger
# 使用日志系统记录 sql
#appender=com.p6spy.engine.spy.appender.Slf4JLogger
# 设置 p6spy driver 代理
deregisterdrivers=true
# 取消JDBC URL前缀
useprefix=true
# 配置记录 Log 例外,可去掉的结果集有error,info,batch,debug,statement,commit,rollback,result,resultset.
excludecategories=info,debug,result,batch,resultset
# 日期格式
dateformat=yyyy-MM-dd HH:mm:ss
# 实际驱动可多个
#driverlist=org.h2.Driver
# 是否开启慢SQL记录
outagedetection=true
# 慢SQL记录标准 2 秒
outagedetectioninterval=2
```

## 2.5 条件构造器

- `PostService.java` ：业务层接口

```java
public interface PostService extends IService<Post> {

    IPage<PostVo> selectPosts(Page page, Long categoryId, Long userId, Integer level, Boolean recommend, String order);
}
```

- `PostServiceImpl.java`：业务层实现

```java
@Service
public class PostServiceImpl extends ServiceImpl<PostMapper, Post> implements PostService {
    @Autowired
    PostMapper postMapper;

    @Override
    public IPage<PostVo> selectPosts(Page page, Long categoryId, Long userId, Integer level, Boolean recommend, String order) {
        if (level == null) level = -1;
        QueryWrapper wrapper = new QueryWrapper<Post>()
                .eq(categoryId != null, "category_id", categoryId)
                .eq(userId != null, "user_id", userId)
                .eq(level == 0, "level", 0)
                .gt(level > 0, "level", 0)
                .orderByDesc(order != null, order);
        return postMapper.selectPosts(page, wrapper);
    }

    @Override
    public PostVo selectOnePost(QueryWrapper<Post> warapper) {
        return postMapper.selectOnePost(warapper);
    }
}
```

- `PostMapper.java` ：数据层接口

```java
public interface PostMapper extends BaseMapper<Post> {

    IPage<PostVo> selectPosts(Page page, @Param(Constants.WRAPPER) QueryWrapper<Post> wrapper);
}
```

- `PostMapper.xml` ：数据层实现

```xml
<select id="selectPosts" resultType="org.myslayers.vo.PostVo">
SELECT p.id,
       p.title,
       p.content,
       p.edit_mode,
       p.category_id,
       p.user_id,
       p.vote_up,
       p.vote_down,
       p.view_count,
       p.comment_count,
       p.recommend,
       p.level,
       p.status,
       p.created,
       p.modified,

       u.id       AS authorId,
       u.username AS authorName,
       u.avatar   AS authorAvatar,

       c.id       AS categoryId,
       c.name     AS categoryName
FROM m_post p
       LEFT JOIN m_user u ON p.user_id = u.id
       LEFT JOIN m_category c ON p.category_id = c.id
  ${ew.customSqlSegment}
</select>
```
