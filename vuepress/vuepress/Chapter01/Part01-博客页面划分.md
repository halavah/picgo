# Part01-博客页面划分

```text
blog
│  pom.xml
│
├─src
│  └─main
│      ├─java
│      └─resources
│          │  application.yml
│          │
│          ├─templates
│          │  └─inc
│          │        common.ftl
│          │        footer.ftl
│          │        header.ftl
│          │        header-panel.ftl
│          │        layout.ftl
│          │        left.ftl
│          │        right.ftl
```

## 1.1 导航栏（header.ftl）

- 图标
- 登录/注册

## 1.2 分类（header-panel.ftl）

- 首页
- 提问、分享、讨论、建议

## 1.3 左侧md8（left.ftl）

## 1.4 右侧md4（right.ftl）

## 1.5 宏（common.ftl）

- 分页：`<@paging XXX></@paging>`
- 一条数据 posting：`<@plisting XXX></@plisting>`

## 1.6 布局（layout.ftl）

- 宏：macro 定义脚本，名为 layout，参数为 title
- 划分：header.ftl、<#nested/>、footer.ftl

## 1.7 项目环境

- `application.yml` ：配置文件，【识别 Mapper 层】

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
    cache: false  # 清除缓存实现热部署，部署环境，建议开启 true（默认）
```

- `pom.xml` ：项目依赖

```xml
<dependencies>
  <!--SpringMVC-->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>

  <!--Lombok-->
  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
  </dependency>

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

  <!--Freemarker-->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-freemarker</artifactId>
  </dependency>

  <!-- commons-lang3 -->
  <dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-lang3</artifactId>
    <version>3.9</version>
  </dependency>

  <!--Devtools-->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
  </dependency>

  <!--test-->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
    <exclusions>
      <exclusion>
        <groupId>org.junit.vintage</groupId>
        <artifactId>junit-vintage-engine</artifactId>
      </exclusion>
    </exclusions>
  </dependency>
</dependencies>
```
