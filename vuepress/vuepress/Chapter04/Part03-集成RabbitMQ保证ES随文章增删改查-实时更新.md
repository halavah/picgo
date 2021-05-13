# Part03-集成RabbitMQ保证ES随文章增删改查-实时更新

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
│      │          │      RabbitConfig.java
│      │          │
│      │          ├─controller
│      │          │      BaseController.java
│      │          │      PostController.java
│      │          │
│      │          ├─service
│      │          │  │   SearchService.java
│      │          │  │
│      │          │  └─impl
│      │          │         SearchServiceImpl.java
│      │          │
│      │          └─search
│      │             └─amqp
│      │                    MqMessageHandler.java
│      │                    PostMqIndexMessage.java
│      │
│      └─resources
│          │  application.yml
```

## 3.1 集成 RabbitMQ 环境

- `pom.xml` ：项目依赖，【RabbitMQ 消息同步】

```xml
<dependencies>
  <!--rabbitmq：消息同步-->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
    <version>2.1.2.RELEASE</version>
  </dependency>
</dependencies>
```

- `application.yml` ：配置文件，【RabbitMQ 消息同步】

```yaml
spring:
  rabbitmq:
    username: guest
    password: guest
    host: 127.0.0.1
    port: 5672
```

## 3.2 配置 RabbitMQ 环境

- `RabbitConfig.java` ：配置类，【创建队列、交换机，并把它们通过 es_bind_key 进行绑定】

```java
/**
 * RabbitConfig：配置类
 */
@Configuration
public class RabbitConfig {

    public final static String es_queue = "es_queue";
    public final static String es_exchage = "es_exchage";
    public final static String es_bind_key = "es_exchage";

    //队列
    @Bean
    public Queue exQueue() {
        return new Queue(es_queue);
    }

    //交换机
    @Bean
    DirectExchange exchange() {
        return new DirectExchange(es_exchage);
    }

    //绑定队列与交换机
    @Bean
    Binding binding(Queue exQueue, DirectExchange exchange) {
        return BindingBuilder.bind(exQueue).to(exchange).with(es_bind_key);
    }
}
```

- `PostMqIndexMessage.java` ：实体类，供 -> 【/post/submit、/post/delete】 -> 使用 convertAndSend 【 交换机，路由密钥，发送的消息（操作的文章、操作的类型) 】

```java
/**
 * PostMqIndexMessage：实体类
 * 供 -> 【/post/submit、/post/delete】 -> 使用 convertAndSend 【 交换机，路由密钥，发送的消息（操作的文章、操作的类型) 】
 */
@Data
@AllArgsConstructor
public class PostMqIndexMessage implements Serializable {

    // 两种type：一种是create_update、一种是remove
    public final static String CREATE_OR_UPDATE = "create_update";
    public final static String REMOVE = "remove";

    // 操作的文章：postId
    private Long postId;

    // 操作的类型：增删改查
    private String type;

}
```

- `MqMessageHandler.java` ：执行类，【执行操作的逻辑】

```java
/**
 * RabbitMQ：执行操作的逻辑
 */
@Slf4j
@Component
@RabbitListener(queues = RabbitConfig.es_queue) //监听的队列es_queue
public class MqMessageHandler {

    @Autowired
    SearchService searchService;

    @RabbitHandler
    public void handler(org.myslayers.search.amqp.PostMqIndexMessage message) {

        log.info("mq 收到一条消息： {}", message.toString());

        switch (message.getType()) {
            //类型：创建或更新，【CREATE_OR_UPDATE】
            case PostMqIndexMessage.CREATE_OR_UPDATE:
                searchService.createOrUpdateIndex(message);
                break;

            //类型：删除，【REMOVE】
            case PostMqIndexMessage.REMOVE:
                searchService.removeIndex(message);
                break;

            //其他类型：输出错误日志
            default:
                log.error("没找到对应的消息类型，请注意！！ --》 {}", message.toString());
                break;
        }
    }
}
```

- `SearchServiceImpl.java` ：业务层实现，【创建/更新文章】、删除文章

```java
@Slf4j
@Service
public class SearchServiceImpl implements SearchService {

    @Autowired
    PostRepository postRepository;

    @Autowired
    PostService postService;

    /**
     * ES：createOrUpdateIndex 创建/更新文章
     */
    @Override
    public void createOrUpdateIndex(PostMqIndexMessage message) {
        //根据message.getPostId() -> 查询文章
        PostVo postVo = postService.selectOnePost(
            new QueryWrapper<Post>().eq("p.id", message.getPostId())
        );

        //将postVo -> PostDocment
        PostDocment postDocment = new ModelMapper().map(postVo, PostDocment.class);
        postRepository.save(postDocment);

        log.info("es 索引更新成功！ ---> {}", postDocment.toString());
    }

    /**
     * ES：removeIndex 删除文章
     */
    @Override
    public void removeIndex(PostMqIndexMessage message) {
        //根据message.getPostId() -> 删除文章
        postRepository.deleteById(message.getPostId());

        log.info("es 索引删除成功！ ---> {}", message.toString());
    }
}
```

## 3.3 使用 RabbitMQ 保证 ES 随文章增删改查-实时更新

- `PostController.java` ：控制层，【消息同步，通知消息给 RabbitMQ，告知 ES【更新文章或添加文章】、【删除文章】】

```java
@Controller
public class PostController extends BaseController {
    /**
     * 详情detail：【删除】文章
     */
    @ResponseBody
    @Transactional
    @PostMapping("/post/delete")
    public Result delete(Long id) {
        Post post = postService.getById(id);
        Assert.notNull(post, "该帖子已被删除");
        Assert.isTrue(post.getUserId().longValue() == getProfileId().longValue(), "无权限删除此文章！");

        // 删除-该篇文章【该篇文章】-Post
        postService.removeById(id);
        // 删除-我的消息【收到消息】-UserMessage中的post_id
        messageService.removeByMap(MapUtil.of("post_id", id));
        // 删除-用户中心【收藏的帖】-UserCollection中的post_id
        collectionService.removeByMap(MapUtil.of("post_id", id));

        // RabbitMQ：消息同步，通知消息给RabbitMQ，告知【更新或添加】
        // convertAndSend 【 交换机，路由密钥，发送的消息（操作的文章、操作的类型) 】
        amqpTemplate.convertAndSend(RabbitConfig.es_exchage, RabbitConfig.es_bind_key, new PostMqIndexMessage(post.getId(), PostMqIndexMessage.REMOVE));

        return Result.success().action("/user/index");
    }

    /**
     * 添加/编辑edit：【提交】文章
     */
    @ResponseBody
    @PostMapping("/post/submit")
    public Result submit(Post post) {
        // 使用ValidationUtil工具类，校验【输入是否错误】
        ValidationUtil.ValidResult validResult = ValidationUtil.validateBean(post);
        if (validResult.hasErrors()) {
            return Result.fail(validResult.getErrors());
        }

        // 在传入【req.setAttribute("post", post);】后，同一页面请求的数据，可以通过post.getId()查询到【id】
        // 如果id不存在，则为【添加-文章】
        if (post.getId() == null) {
            post.setUserId(getProfileId());
            post.setModified(new Date());
            post.setCreated(new Date());
            post.setCommentCount(0);
            post.setEditMode(null);
            post.setLevel(0);
            post.setRecommend(false);
            post.setViewCount(0);
            post.setVoteDown(0);
            post.setVoteUp(0);
            postService.save(post);
        } else {
            // 如果id存在，则为【更新-文章】
            Post tempPost = postService.getById(post.getId());
            Assert.isTrue(tempPost.getUserId().longValue() == getProfileId().longValue(), "无权限编辑此文章！");
            tempPost.setTitle(post.getTitle());
            tempPost.setContent(post.getContent());
            tempPost.setCategoryId(post.getCategoryId());
            postService.updateById(tempPost);
        }

        // RabbitMQ：消息同步，通知消息给RabbitMQ，告知【更新或添加】
        // convertAndSend 【 交换机，路由密钥，发送的消息（操作的文章、操作的类型) 】
        amqpTemplate.convertAndSend(RabbitConfig.es_exchage, RabbitConfig.es_bind_key, new PostMqIndexMessage(post.getId(), PostMqIndexMessage.CREATE_OR_UPDATE));

        // 无论id是否存在，两类情况都会 retern 跳转到 /post/${id}
        return Result.success().action("/post/" + post.getId());
    }
}
```
