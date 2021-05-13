# Part02-集成Elasticsearch实现文章内容-搜索引擎

```text
blog
│  pom.xml
│
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          ├─controller
│      │          │      BaseController.java
│      │          │      AdminController.java
│      │          │      IndexController.java
│      │          │
│      │          ├─service
│      │          │  │  SearchService.java
│      │          │  │
│      │          │  └─impl
│      │          │         SearchServiceImpl.java
│      │          ├─search
│      │          │  │
│      │          │  ├─model
│      │          │  │      PostDocment.java
│      │          │  │
│      │          │  └─repository
│      │          │         PostRepository.java
│      │
│      └─resources
│          │  application.yml
│          │
│          ├─templates
│          │  │  search.ftl
│          │  │
│          │  └─user
│          │         set.ftl
```

## 2.1 集成 Elasticsearch 环境

- `pom.xml` ：项目依赖，【elasticsearch 搜索引擎】

```xml
<dependencies>
  <!--elasticsearch-6.4.3：搜索引擎 -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
    <version>2.1.1.RELEASE</version>
  </dependency>

  <!--modelmapper：Model和DTO模型类的转换-->
  <dependency>
    <groupId>org.modelmapper</groupId>
    <artifactId>modelmapper</artifactId>
    <version>1.1.1</version>
  </dependency>
</dependencies>
```

- `application.yml` ：配置文件，【elasticsearch 搜索引擎】

```yaml
spring:
  data:
    elasticsearch:
      cluster-name: elasticsearch
      cluster-nodes: 127.0.0.1:9300
      repositories:
        enabled: true
```

- `Application.java`：项目启动，【解决 elasticsearch 启动时，由于底层 netty 版本问题引发的项目启动问题】

```java
@EnableScheduling//开启定时器
@SpringBootApplication
public class Application {

    public static void main(String[] args) {

        // 解决elasticsearch启动时，由于底层netty版本问题引发的项目启动问题
        System.setProperty("es.set.netty.runtime.available.processors", "false");

        SpringApplication.run(Application.class, args);
        System.out.println("http://localhost:8080");
    }
}
```

## 2.2 配置 Elasticsearch 环境

- `PostDocment.java` ：实体类，【类似 MySQL 表】

```java
/**
 * Elasticsearch：实体类，类似MySQL表
 */
@Data
//indexName代表索引名称，type代表post类型，createIndex代表”启动时，是否创建该文档，默认为true“
@Document(indexName="post", type="post", createIndex=true)
public class PostDocment implements Serializable {

    //主键ID
    @Id
    private Long id;

    //文章的【标题title】
    //ik分词器：文本Text、最粗粒度的拆分ik_smart、最细粒度的拆分ik_max_word
    @Field(type = FieldType.Text, searchAnalyzer="ik_smart", analyzer = "ik_max_word")
    private String title;

    //文章的【作者id】
    @Field(type = FieldType.Long)
    private Long authorId;

    //文章的【作者name】
    @Field(type = FieldType.Keyword)
    private String authorName;

    //文章的【作者avatar】
    private String authorAvatar;

    //文章的【分类id】
    private Long categoryId;

    //文章的【分类name】
    @Field(type = FieldType.Keyword)
    private String categoryName;

    //文章的【置顶等级】
    private Integer level;

    //文章的【精华】
    private Boolean recomment;

    //文章的【评论数量】
    private Integer commentCount;

    //文章的【访问量】
    private Integer viewCount;

    //文章的【创建日期】
    @Field(type = FieldType.Date)
    private Date created;
}
```

- `PostRepository.java` ：配置类，【自定义 ElasticsearchRepository】

```java
/**
 * PostRepository：继承ElasticsearchRepository
 */
@Repository
public interface PostRepository extends ElasticsearchRepository<PostDocment, Long> {
    // 符合jpa命名规范的接口
    // ...
}
```

## 2.3 使用 Elasticsearch 搜索引擎-【搜索按钮】

- `/res/mods/index.js` ：源码可知，【将默认跳转<http://cn.bing.com/search> 更改为 /search】

```javascript
//搜索
$('.fly-search').on('click', function () {
  layer.open({
    type: 1
    ,
    title: false
    ,
    closeBtn: false
    //,shade: [0.1, '#fff']
    ,
    shadeClose: true
    ,
    maxWidth: 10000
    ,
    skin: 'fly-layer-search'
    ,
    content: [
      '<form action="/search">' //将http://cn.bing.com/search 更改为 /search
      ,
      '<input autocomplete="off" placeholder="搜索内容，回车跳转" type="text" name="q">'
      , '</form>'].join('')
    ,
    success: function (layero) {
      var input = layero.find('input');
      input.focus();

      layero.find('form').submit(function () {
        var val = input.val();
        if (val.replace(/\s/g, '') === '') {
          return false;
        }

        //关闭默认跳转搜索链接，发现跳转接口为“https://cn.bing.com/search?q=xxx”
        // input.val('site:layui.com ' + input.val());
      });
    }
  })
});
```

- `IndexController.java` ：控制层，【搜索按钮】

```java
@Controller
public class IndexController extends BaseController {
    /**
     * 搜索 Elasticsearch
     */
    @GetMapping("/search")
    public String search(String q) {
        //使用自定义es的search方法，进行查询
        IPage pageData = searchService.search(getPage(), q);

        //关键词：${q}
        req.setAttribute("q", q);
        //搜索结果：${pageData.total}、${pageData.records}
        req.setAttribute("pageData", pageData);

        return "search";
    }
}
```

- `SearchServiceImpl.java` ：业务层实现，【search 搜索，使用模型映射器进行 MP-page -> 转换为 JPA-page -> 转换为 MP-page】

```java
@Service
public class SearchServiceImpl implements SearchService {

    @Autowired
    PostRepository postRepository;

    /**
     * ES：search 搜索
     */
    @Override
    public IPage search(Page page, String keyword) {
        //1.将MP-page -> 转换为 JPA-page
        Long current = page.getCurrent() - 1;
        Long size = page.getSize();
        Pageable pageable = PageRequest.of(current.intValue(), size.intValue());

        //2.使用ES -> 得到 pageData数据
        MultiMatchQueryBuilder multiMatchQueryBuilder = QueryBuilders.multiMatchQuery(keyword, "title", "authorName", "categoryName");
        org.springframework.data.domain.Page<PostDocment> docments = postRepository.search(multiMatchQueryBuilder, pageable);

        //3.将JPA-page -> 转换为 MP-page
        IPage pageData = new Page(page.getCurrent(), page.getSize(), docments.getTotalElements());
        pageData.setRecords(docments.getContent());
        return pageData;
    }
}
```

- `search.ftl` ：目标引擎，【搜索结果后的页面】

```injectedfreemarker
<#--宏layout.ftl（导航栏 + 页脚）-->
<#include "/inc/layout.ftl" />

<#--【三、填充（导航栏 + 页脚）】-->
<@layout "搜索 - ${q}">

<#--【二、分类】-->
    <#include "/inc/header-panel.ftl" />

  <div class="layui-container">
      <div class="layui-row layui-col-space15">

      <#--1.左侧md8-->
          <div class="layui-col-md8">
              <div class="fly-panel">

              <#--1.2.1 共有X条记录-->
                  <div class="fly-panel-title fly-filter">
                      <a>您正在搜索关键字”${q}“，共有 <strong>${pageData.total}</strong> 条记录</a>
                      <a href="#signin" class="layui-hide-sm layui-show-xs-block fly-right" id="LAY_goSignin" style="color: #FF5722;">去签到</a>
                  </div>

              <#--1.2.2 消息列表-->
                  <ul class="fly-list">
            <#list pageData.records as post>
              <@plisting post></@plisting>
            </#list>
                  </ul>

              <#--1.2.3 分页条-->
                  <div style="text-align: center">
                  <#--待渲染的div块（laypage-main）-->
                      <div id="laypage-main"></div>

                  <#--Script渲染div块-->
                      <script src="/res/layui/layui.js"></script>
                      <script>
                          layui.use('laypage', function () {
                              var laypage = layui.laypage;

                              //执行一个laypage实例
                              laypage.render({
                                  elem: 'laypage-main'
                                  , count: ${pageData.total}
                                  , curr: ${pageData.current}
                                  , limit: ${pageData.size}
                                  , jump: function (obj, first) {
                                      //首次不执行，之后【跳转curr页面】
                                      if (!first) {
                                          location.href = "?q=" + '${q}' + "&&pn=" + obj.curr;
                                      }
                                  }
                              });
                          });
                      </script>
                  </div>

              </div>
          </div>

      <#--2.右侧md4-->
      <#include "/inc/right.ftl" />
      </div>
  </div>
</@layout>
```

## 2.4 使用 Elasticsearch 搜索引擎-【管理员-同步ES数据】

- `AdminController.java` ：超级用户，【只有管理员，才可以同步 ES 数据】

```java
@Controller
public class AdminController extends BaseController {
    /**
     * 管理员操作：同步ES数据
     */
    @ResponseBody
    @PostMapping("admin/initEsData")
    public Result initEsData() {
        //total：索引总记录
        long total = 0;

        //从第1页 -> 检索 -> 到第1000页
        for (int i = 1; i < 1000; i++) {
            //current：当前页   size：每页显示1000条数
            Page page = new Page(i, 1000);

            //调用【postService层】的selectPosts方法 -> 进行 IPage<PostVo> 查询
            IPage<PostVo> paging = postService.selectPosts(page, null, null, null, null, null);

            //调用【searchService层】的initEsData方法 -> 进行 total 统计
            total += searchService.initEsData(paging.getRecords());

            //某一次循环的查询过程中，如果【该页查询 小于 1000条】时，说明【该页 已经是 最后一页了】，因此使用break，停止查询
            if (paging.getRecords().size() < 1000) {
                break;
            }
        }
        return Result.success("ES索引初始化成功，共 " + total + " 条记录！", null);
    }
}
```

- `SearchServiceImpl.java` ：业务层实现，【initEsData 初始化数据】

```java
@Service
public class SearchServiceImpl implements SearchService {

    @Autowired
    PostRepository postRepository;

    /**
     * ES：initEsData 初始化数据
     */
    @Override
    public int initEsData(List<PostVo> records) {
        if(records == null || records.isEmpty()) {
            return 0;
        }

        //将List<PostVo> -> List<PostDocment>
        List<PostDocment> documents = new ArrayList<>();
        for(PostVo vo : records) {
            //转换操作：将source映射到destinationType的实例，map(Object source, Class<D> destinationType)
            PostDocment postDocment = new ModelMapper().map(vo, PostDocment.class);
            documents.add(postDocment);
        }
        postRepository.saveAll(documents);
        return documents.size();
    }
}
```

- `set.ftl` ：模板引擎，【只有管理员，才可以同步 ES 数据】

```injectedfreemarker
<#--4.同步ES数据-->
<@shiro.hasRole name="admin">
  <div class="layui-form layui-form-pane layui-tab-item">
   <form action="/admin/initEsData" method="post">
    <button class="layui-btn" key="set-mine" lay-filter="*" lay-submit alert="true">同步ES数据
    </button>
   </form>
  </div>
</@shiro.hasRole>
```
