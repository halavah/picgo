# Part06-侧边栏本周热议

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
│      │          │      RedisConfig.java
│      │          │      ContextStartup.java
│      │          │      FreemarkerConfig.java
│      │          │
│      │          ├─service
│      │          │  │  PostService.java
│      │          │  │
│      │          │  └─impl
│      │          │         PostServiceImpl.java
│      │          │
│      │          ├─template
│      │          │      HotsTemplate.java
│      │          │
│      │          ├─utils
│      │          │      RedisUtil.java
│      │
│      └─resources
│          ├─templates
│          │  └─inc
│          │        right.ftl
```

## 6.1 Redis环境搭建

- `pom.xml` ：项目依赖，【添加 redis 依赖，添加 hutool 依赖】

```xml
<dependencies>
    <!--Redis-->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>

    <!--hutool：工具包，例如DateUtils工具类...-->
    <dependency>
        <groupId>cn.hutool</groupId>
        <artifactId>hutool-all</artifactId>
        <version>4.1.17</version>
    </dependency>
</dependencies>
```

- `RedisConfig.java` ：配置类，【考虑到 redis 序列化后出现乱码问题，使用 RedisConfig 配置类进行编码的处理】

```java
/**
 * 指定Redis的序列化后的格式
 */
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<Object, Object> template = new RedisTemplate();
        template.setConnectionFactory(redisConnectionFactory);

        Jackson2JsonRedisSerializer jackson2JsonRedisSerializer = new Jackson2JsonRedisSerializer(Object.class);
        jackson2JsonRedisSerializer.setObjectMapper(new ObjectMapper());

        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(jackson2JsonRedisSerializer);

        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(jackson2JsonRedisSerializer);

        return template;
    }

}
```

- `RedisUtil.java` ：工具类

```java
/**
 * RedisUtil 工具类
 */
@Component
public class RedisUtil {

    @Autowired
    private RedisTemplate redisTemplate;

    /**
     * 指定缓存失效时间
     *
     * @param key  键
     * @param time 时间(秒)
     * @return
     */
    public boolean expire(String key, long time) {
        try {
            if (time > 0) {
                redisTemplate.expire(key, time, TimeUnit.SECONDS);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 根据key 获取过期时间
     *
     * @param key 键 不能为null
     * @return 时间(秒) 返回0代表为永久有效
     */
    public long getExpire(String key) {
        return redisTemplate.getExpire(key, TimeUnit.SECONDS);
    }

    /**
     * 判断key是否存在
     *
     * @param key 键
     * @return true 存在 false不存在
     */
    public boolean hasKey(String key) {
        try {
            return redisTemplate.hasKey(key);
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 删除缓存
     *
     * @param key 可以传一个值 或多个
     */
    @SuppressWarnings("unchecked")
    public void del(String... key) {
        if (key != null && key.length > 0) {
            if (key.length == 1) {
                redisTemplate.delete(key[0]);
            } else {
                redisTemplate.delete(CollectionUtils.arrayToList(key));
            }
        }
    }

    //============================String=============================

    /**
     * 普通缓存获取
     *
     * @param key 键
     * @return 值
     */
    public Object get(String key) {
        return key == null ? null : redisTemplate.opsForValue().get(key);
    }

    /**
     * 普通缓存放入
     *
     * @param key   键
     * @param value 值
     * @return true成功 false失败
     */
    public boolean set(String key, Object value) {
        try {
            redisTemplate.opsForValue().set(key, value);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }

    }

    /**
     * 普通缓存放入并设置时间
     *
     * @param key   键
     * @param value 值
     * @param time  时间(秒) time要大于0 如果time小于等于0 将设置无限期
     * @return true成功 false 失败
     */
    public boolean set(String key, Object value, long time) {
        try {
            if (time > 0) {
                redisTemplate.opsForValue().set(key, value, time, TimeUnit.SECONDS);
            } else {
                set(key, value);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 递增
     *
     * @param key 键
     * @param delta  要增加几(大于0)
     * @return
     */
    public long incr(String key, long delta) {
        if (delta < 0) {
            throw new RuntimeException("递增因子必须大于0");
        }
        return redisTemplate.opsForValue().increment(key, delta);
    }

    /**
     * 递减
     *
     * @param key 键
     * @param delta  要减少几(小于0)
     * @return
     */
    public long decr(String key, long delta) {
        if (delta < 0) {
            throw new RuntimeException("递减因子必须大于0");
        }
        return redisTemplate.opsForValue().increment(key, -delta);
    }

    //================================Map=================================

    /**
     * HashGet
     *
     * @param key  键 不能为null
     * @param item 项 不能为null
     * @return 值
     */
    public Object hget(String key, String item) {
        return redisTemplate.opsForHash().get(key, item);
    }

    /**
     * 获取hashKey对应的所有键值
     *
     * @param key 键
     * @return 对应的多个键值
     */
    public Map<Object, Object> hmget(String key) {
        return redisTemplate.opsForHash().entries(key);
    }

    /**
     * HashSet
     *
     * @param key 键
     * @param map 对应多个键值
     * @return true 成功 false 失败
     */
    public boolean hmset(String key, Map<String, Object> map) {
        try {
            redisTemplate.opsForHash().putAll(key, map);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * HashSet 并设置时间
     *
     * @param key  键
     * @param map  对应多个键值
     * @param time 时间(秒)
     * @return true成功 false失败
     */
    public boolean hmset(String key, Map<String, Object> map, long time) {
        try {
            redisTemplate.opsForHash().putAll(key, map);
            if (time > 0) {
                expire(key, time);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 向一张hash表中放入数据,如果不存在将创建
     *
     * @param key   键
     * @param item  项
     * @param value 值
     * @return true 成功 false失败
     */
    public boolean hset(String key, String item, Object value) {
        try {
            redisTemplate.opsForHash().put(key, item, value);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 向一张hash表中放入数据,如果不存在将创建
     *
     * @param key   键
     * @param item  项
     * @param value 值
     * @param time  时间(秒)  注意:如果已存在的hash表有时间,这里将会替换原有的时间
     * @return true 成功 false失败
     */
    public boolean hset(String key, String item, Object value, long time) {
        try {
            redisTemplate.opsForHash().put(key, item, value);
            if (time > 0) {
                expire(key, time);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 删除hash表中的值
     *
     * @param key  键 不能为null
     * @param item 项 可以使多个 不能为null
     */
    public void hdel(String key, Object... item) {
        redisTemplate.opsForHash().delete(key, item);
    }

    /**
     * 判断hash表中是否有该项的值
     *
     * @param key  键 不能为null
     * @param item 项 不能为null
     * @return true 存在 false不存在
     */
    public boolean hHasKey(String key, String item) {
        return redisTemplate.opsForHash().hasKey(key, item);
    }

    /**
     * hash递增 如果不存在,就会创建一个 并把新增后的值返回
     *
     * @param key  键
     * @param item 项
     * @param by   要增加几(大于0)
     * @return
     */
    public double hincr(String key, String item, double by) {
        return redisTemplate.opsForHash().increment(key, item, by);
    }

    /**
     * hash递减
     *
     * @param key  键
     * @param item 项
     * @param by   要减少记(小于0)
     * @return
     */
    public double hdecr(String key, String item, double by) {
        return redisTemplate.opsForHash().increment(key, item, -by);
    }

    //============================set=============================

    /**
     * 根据key获取Set中的所有值
     *
     * @param key 键
     * @return
     */
    public Set<Object> sGet(String key) {
        try {
            return redisTemplate.opsForSet().members(key);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * 根据value从一个set中查询,是否存在
     *
     * @param key   键
     * @param value 值
     * @return true 存在 false不存在
     */
    public boolean sHasKey(String key, Object value) {
        try {
            return redisTemplate.opsForSet().isMember(key, value);
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 将数据放入set缓存
     *
     * @param key    键
     * @param values 值 可以是多个
     * @return 成功个数
     */
    public long sSet(String key, Object... values) {
        try {
            return redisTemplate.opsForSet().add(key, values);
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    /**
     * 将set数据放入缓存
     *
     * @param key    键
     * @param time   时间(秒)
     * @param values 值 可以是多个
     * @return 成功个数
     */
    public long sSetAndTime(String key, long time, Object... values) {
        try {
            Long count = redisTemplate.opsForSet().add(key, values);
            if (time > 0) expire(key, time);
            return count;
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    /**
     * 获取set缓存的长度
     *
     * @param key 键
     * @return
     */
    public long sGetSetSize(String key) {
        try {
            return redisTemplate.opsForSet().size(key);
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    /**
     * 移除值为value的
     *
     * @param key    键
     * @param values 值 可以是多个
     * @return 移除的个数
     */
    public long setRemove(String key, Object... values) {
        try {
            Long count = redisTemplate.opsForSet().remove(key, values);
            return count;
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }
    //===============================list=================================

    /**
     * 获取list缓存的内容
     *
     * @param key   键
     * @param start 开始
     * @param end   结束  0 到 -1代表所有值
     * @return
     */
    public List<Object> lGet(String key, long start, long end) {
        try {
            return redisTemplate.opsForList().range(key, start, end);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * 获取list缓存的长度
     *
     * @param key 键
     * @return
     */
    public long lGetListSize(String key) {
        try {
            return redisTemplate.opsForList().size(key);
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    /**
     * 通过索引 获取list中的值
     *
     * @param key   键
     * @param index 索引  index>=0时， 0 表头，1 第二个元素，依次类推；index<0时，-1，表尾，-2倒数第二个元素，依次类推
     * @return
     */
    public Object lGetIndex(String key, long index) {
        try {
            return redisTemplate.opsForList().index(key, index);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * 将list放入缓存
     *
     * @param key   键
     * @param value 值
     * @return
     */
    public boolean lSet(String key, Object value) {
        try {
            redisTemplate.opsForList().rightPush(key, value);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 将list放入缓存
     *
     * @param key   键
     * @param value 值
     * @param time  时间(秒)
     * @return
     */
    public boolean lSet(String key, Object value, long time) {
        try {
            redisTemplate.opsForList().rightPush(key, value);
            if (time > 0) expire(key, time);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 将list放入缓存
     *
     * @param key   键
     * @param value 值
     * @return
     */
    public boolean lSet(String key, List<Object> value) {
        try {
            redisTemplate.opsForList().rightPushAll(key, value);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 将list放入缓存
     *
     * @param key   键
     * @param value 值
     * @param time  时间(秒)
     * @return
     */
    public boolean lSet(String key, List<Object> value, long time) {
        try {
            redisTemplate.opsForList().rightPushAll(key, value);
            if (time > 0) expire(key, time);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 根据索引修改list中的某条数据
     *
     * @param key   键
     * @param index 索引
     * @param value 值
     * @return
     */
    public boolean lUpdateIndex(String key, long index, Object value) {
        try {
            redisTemplate.opsForList().set(key, index, value);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 移除N个值为value
     *
     * @param key   键
     * @param count 移除多少个
     * @param value 值
     * @return 移除的个数
     */
    public long lRemove(String key, long count, Object value) {
        try {
            Long remove = redisTemplate.opsForList().remove(key, count, value);
            return remove;
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    //================有序集合 sort set===================
    /**
     * 有序set添加元素
     *
     * @param key
     * @param value
     * @param score
     * @return
     */
    public boolean zSet(String key, Object value, double score) {
        return redisTemplate.opsForZSet().add(key, value, score);
    }

    public long batchZSet(String key, Set<ZSetOperations.TypedTuple> typles) {
        return redisTemplate.opsForZSet().add(key, typles);
    }

    public void zIncrementScore(String key, Object value, long delta) {
        redisTemplate.opsForZSet().incrementScore(key, value, delta);
    }

    /**
     * ZUNIONSTORE destination numkeys key [key ...]中，无numkeys，因为numkeys = key + otherKeys
     *
     * @param key 【第7天的key，即今天的key】
     * @param otherKeys 【前6天的keys，用Collection集合来保存】
     * @param destKey 描述key
     */
    public void zUnionAndStore(String key, Collection otherKeys, String destKey) {
        redisTemplate.opsForZSet().unionAndStore(key, otherKeys, destKey);
    }

    /**
     * 获取zset数量
     * @param key
     * @param value
     * @return
     */
    public long getZsetScore(String key, Object value) {
        Double score = redisTemplate.opsForZSet().score(key, value);
        if(score==null){
            return 0;
        }else{
            return score.longValue();
        }
    }

    /**
     * 获取有序集 key 中成员 member 的排名 。
     * 其中有序集成员按 score 值递减 (从大到小) 排序。
     * @param key
     * @param start
     * @param end
     * @return
     */
    public Set<ZSetOperations.TypedTuple> getZSetRank(String key, long start, long end) {
        return redisTemplate.opsForZSet().reverseRangeWithScores(key, start, end);
    }

}
```

## 6.2 本周热议的【基本原理】

- 缓存热评文章——哈希表 Hash
- 评论数量排行——有序列表 sortedSet：ZADD（添加）、ZREVRANGE（展示）、ZUNIONSTORE（并集）
- ZADD key score member [[score member] [score member] ...]

```text
127.0.0.1:6379> ZADD day:18 10 post:1 6 post:2 4 post:3
(integer) 3
127.0.0.1:6379> ZADD day:19 10 post:1 6 post:2 4 post:3
(integer) 3
127.0.0.1:6379> ZADD day:20 10 post:1 6 post:2 4 post:3
(integer) 3
127.0.0.1:6379> ZADD day:21 10 post:1 6 post:2 4 post:3
(integer) 3
127.0.0.1:6379> ZADD day:22 10 post:1 6 post:2 4 post:3
(integer) 3
127.0.0.1:6379> ZADD day:23 10 post:1 6 post:2 4 post:3
(integer) 3
127.0.0.1:6379> ZADD day:24 10 post:1 6 post:2 4 post:3
(integer) 3
```

- ZREVRANGE key start stop [WITHSCORES]

```text
127.0.0.1:6379> ZREVRANGE day:18 0 -1 withscores
1) "post:1"
2) "10"
3) "post:2"
4) "6"
5) "post:3"
6) "4"
```

- ZUNIONSTORE destination numkeys key [key ...] [WEIGHTS weight [weight ...]] [AGGREGATE SUM|MIN|MAX]

```text
127.0.0.1:6379> ZUNIONSTORE week:rank 7 day:18 day:19 day:20 day:21 day:22 day:23 day:24
1) "post:1"
2) "post:2"
```

- 查看排行榜

```text
127.0.0.1:6379> ZREVRANGE week:rank 0 -1 withscores
1) "post:1"
2) "70"
3) "post:2"
4) "42"
5) "post:3"
6) "28"
```

- 添加/删除评论

```text
127.0.0.1:6379> ZINCRBY day:18 10 post:1
"20"
127.0.0.1:6379> ZREVRANGE  day:18 0 -1 withscores
1) "post:1"
2) "20"
3) "post:2"
4) "6"
5) "post:3"
6) "4"
127.0.0.1:6379> ZINCRBY day:18 -10 post:1
"10"
```

## 6.3 本周热议的【初始化操作】

- 实现逻辑：
  - 项目启动前，获取【近 7 天文章】
  - 初始化【近 7 天文章】的总评论量（先使用 SortedSet 集合对【排行榜 7 天内全部文章】进行 zadd 操作，并设置它们 expire 为 7 天；再使用 Hash 哈希表对【排行榜 7 天内全部文章】进行 hexists 判断，再 hset 缓存操作）
    - 添加 add——将【近 7 天文章】创建日期时间作为 key 值，每篇文章对应的 id 作为它的 value 值，每篇文章对应的评论 comment 作为它的 score 值，并使用 redis 的工具类（RedisUtil），对文章的具体属性进行 zSet()缓存操作
    - 过期 expire——让【近 7 天文章】的 key 过期： 7-（当前时间-创建时间）= 过期时间
    - 缓存——缓存【近 7 天文章】的一些基本信息，例如文章 id，标题 title，评论数量，作者信息...方便访问【近 7 天文章】时，直接 redis，而非 MySQL
      - 先对文章进行 EXISTS 判断其缓存是否存在
      - 如果 false 不存在，则再 hset 缓存操作
  - 对【近 7 天文章】做并集运算（zUnionAndStore）， 并使用根据评论量的数量从大到小进行展示（zrevrange）
- `ContextStartup.java` ：配置类

```java
/**
 * Context配置类
 */
@Component
public class ContextStartup implements ApplicationRunner, ServletContextAware {

    @Autowired
    CategoryService categoryService;

    ServletContext servletContext;

    @Autowired
    PostService postService;

    /**
     * 项目启动时，会同时调用该run方法：
     *
     * 加载导航栏中的“提问、分享、讨论、建议”，并将其list放入servletContext上下文对象
     * 加载本周热议
     */
    @Override
    public void run(ApplicationArguments args) throws Exception {
        List<Category> categories = categoryService.list(new QueryWrapper<Category>()
                .eq("status", 0)
        );
        servletContext.setAttribute("categorys", categories);

        postService.initWeekRank();
    }

    /**
     * servletContext上下文对象
     */
    @Override
    public void setServletContext(ServletContext servletContext) {
        this.servletContext = servletContext;
    }
}
```

- `PostServiceImpl.java` ：业务层实现

```java
@Service
public class PostServiceImpl extends ServiceImpl<PostMapper, Post> implements PostService {

    @Autowired
    RedisUtil redisUtil;

    /**
     * 项目启动前，初始化本周热议（近7天全部文章评论量的排行榜）
     */
    @Override
    public void initWeekRank() {
        //1.获取【近7天文章】
        List<Post> posts = this.list(new QueryWrapper<Post>()
                .gt("created", DateUtil.offsetDay(new Date(), -6))  //根据created时间，对最近7天内的文章进行筛选
                .select("id, title, user_id, comment_count, view_count, created") //对文章的属性进行筛选，加快查询速率
        );

        //2.初始化【近7天文章】的总评论量（先使用SortedSet集合对【排行榜7天内全部文章】进行zadd操作，并设置它们expire为7天；再使用Hash哈希表对【排行榜7天内全部文章】进行hexists判断，再hset缓存操作）
        for (Post post : posts) {
            //1.添加add——|day:rank:20210202--0208|，将【近7天文章】创建日期时间作为key值，每篇文章对应的id作为它的value值，每篇文章对应的评论comment作为它的score值，并使用redis的工具类（RedisUtil），对文章的具体属性进行zSet()缓存操作
            String zKey = "day:rank:" + DateUtil.format(post.getCreated(), DatePattern.PURE_DATE_FORMAT);
            redisUtil.zSet(zKey, post.getId(), post.getCommentCount());//阅读redisUtil工具类，可知zSet等同于zadd

            //2.过期expire——|day:rank:20210202--0208|，让【近7天文章】的key过期： 7-（当前时间-创建时间）= 过期时间
            long expireTime = (7 - DateUtil.between(new Date(), post.getCreated(), DateUnit.DAY)) * 24 * 60 * 60;
            redisUtil.expire(zKey, expireTime);

            //3.缓存——|day:rank:post:1~16|，缓存【近7天文章】的一些基本信息，例如文章id，标题title，评论数量，作者信息...方便访问【近7天文章】时，直接redis，而非MySQL
            //3.1先对文章进行EXISTS判断其缓存是否存在
            String hKey = "day:rank:post:" + post.getId();
            if (!redisUtil.hasKey(hKey)) {
                //3.2如果false不存在，则再hset缓存操作
                redisUtil.hset(hKey, "post-id", post.getId(), expireTime);
                redisUtil.hset(hKey, "post-title", post.getTitle(), expireTime);
                redisUtil.hset(hKey, "post-commentCount", post.getCommentCount(), expireTime);
                redisUtil.hset(hKey, "post-viewCount", post.getViewCount(), expireTime);
            }
        }

        //3.对【近7天文章】做并集运算（zUnionAndStore）， 并使用根据评论量的数量从大到小进行展示（zrevrange）
        String currentKey = "day:rank:" + DateUtil.format(new Date(), DatePattern.PURE_DATE_FORMAT);
        List<String> otherKeys = new ArrayList<>();
        for (int i = -6; i < 0; i++) {
            String temp = "day:rank:" + DateUtil.format(DateUtil.offsetDay(new Date(), i), DatePattern.PURE_DATE_FORMAT);
            otherKeys.add(temp);
        }
        String destKey = "week:rank";
        redisUtil.zUnionAndStore(currentKey, otherKeys, destKey);
    }
}
```

## 6.4 本周热议的【更新操作】

- 实现逻辑：
  - 自增/自减评论数
  - 更新这篇文章的缓存时间，并更新这篇文章的基本信息
  - 对【近 7 天文章】重新做并集运算（zUnionAndStore）， 并使用根据评论量的数量从大到小进行展示（zrevrange）
- `PostServiceImpl.java` ：业务层实现

```java
@Service
public class PostServiceImpl extends ServiceImpl<PostMapper, Post> implements PostService {

    @Autowired
    RedisUtil redisUtil;

    /**
     * 本周热议：增加评论后，通过自增/自减评论数、再对排行榜做并集运算
     */
    @Override
    public void incrCommentCountAndUnionForWeekRank(Post post, boolean isIncr) {
        //1.自增/自减评论数
        String currentKey = "day:rank:" + DateUtil.format(new Date(), DatePattern.PURE_DATE_FORMAT);
        redisUtil.zIncrementScore(currentKey, post.getId(), isIncr ? 1 : -1);

        //2.更新这篇文章的缓存时间，并更新这篇文章的基本信息
        String zKey = "day:rank:" + DateUtil.format(post.getCreated(), DatePattern.PURE_DATE_FORMAT);
        long expireTime = (7 - DateUtil.between(new Date(), post.getCreated(), DateUnit.DAY)) * 24 * 60 * 60;
        redisUtil.expire(zKey, expireTime);
        String hKey = "day:rank:post:" + post.getId();
        if (!redisUtil.hasKey(hKey)) {
            //3.2如果false不存在，则再hset缓存操作
            redisUtil.hset(hKey, "post-id", post.getId(), expireTime);
            redisUtil.hset(hKey, "post-title", post.getTitle(), expireTime);
            redisUtil.hset(hKey, "post-commentCount", post.getCommentCount(), expireTime);
            redisUtil.hset(hKey, "post-viewCount", post.getViewCount(), expireTime);
        }

        //3.对【近7天文章】重新做并集运算（zUnionAndStore）
        List<String> otherKeys = new ArrayList<>();
        for (int i = -6; i < 0; i++) {
            String temp = "day:rank:" + DateUtil.format(DateUtil.offsetDay(new Date(), i), DatePattern.PURE_DATE_FORMAT);
            otherKeys.add(temp);
        }
        String destKey = "week:rank";
        redisUtil.zUnionAndStore(currentKey, otherKeys, destKey);
    }
}
```

## 6.5 本周热议的【标签】

- `HotsTemplate.java` ：标签类，【开发标签】

```java
/**
 * 本周热议文章【标签】
 */
@Component
public class HotsTemplate extends TemplateDirective {

    @Autowired
    RedisUtil redisUtil;

    @Override
    public String getName() {
        return "hots";
    }

    @Override
    public void execute(DirectiveHandler handler) throws Exception {
        List<Map> hostPost = new ArrayList<>();

        // 获取有序集 key 中成员 member 的排名，其中有序集成员按 score 值递减 (从大到小) 排序
        Set<ZSetOperations.TypedTuple> typedTuples = redisUtil.getZSetRank("week:rank", 0, 6);
        for (ZSetOperations.TypedTuple typedTuple : typedTuples) {
            Map<String, Object> map = new HashMap<>();

            //zSet(key， value， score)  -> zSet(文章日期, 文章id, 文章评论数commentCount)，此处取出zSet中的value，即文章id
            String postHashKey = "day:rank:post:" + typedTuple.getValue();

            map.put("id", redisUtil.hget(postHashKey, "post-id"));
            map.put("title", redisUtil.hget(postHashKey, "post-title"));
            map.put("commentCount", redisUtil.hget(postHashKey, "post-commentCount"));
            map.put("viewCount", redisUtil.hget(postHashKey, "post-viewCount"));

            hostPost.add(map);
        }

        handler.put(RESULTS, hostPost).render();
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
     * 注册为“timeAgo”函数：快速实现日期转换 ；注册为“posts”函数：快速实现分页
     */
    @PostConstruct
    public void setUp() {
        configuration.setSharedVariable("timeAgo", timeAgoMethod);
        configuration.setSharedVariable("details", postsTemplate);
        configuration.setSharedVariable("hots", hotsTemplate);
    }
}
```

- `right.ftl` ：模板引擎

```injectedfreemarker
<#--【三（2）、右侧md4】-->
<div class="layui-col-md4">

  <dl class="fly-panel fly-list-one">
    <dt class="fly-panel-title">本周热议</dt>
      <@hots>
          <#list results as post>
            <dd>
              <a href="/post/${post.id}">${post.title}</a>
              <span><i class="iconfont icon-pinglun1"></i> ${post.commentCount}</span>
            </dd>
          </#list>
      </@hots>
  </dl>

  <div class="fly-panel">
    <div class="fly-panel-title">
      站点信息
    </div>
    <div class="fly-panel-main">
      <a href="https://github.com/" target="_blank" class="fly-zanzhu"
         time-limit="2017.09.25-2099.01.01" style="background-color: #5FB878;">Don't let joy take
        you down !</a>
    </div>
  </div>

  <div class="fly-panel fly-link">
    <h3 class="fly-panel-title">友情链接</h3>
    <dl class="fly-panel-main">
      <dd>
        <a href="https://www.youtube.com/" target="_blank">YouTube</a>
      <dd>
      <dd>
        <a href="https://www.facebook.com/" target="_blank">Facebook</a>
      <dd>
      <dd>
        <a href="https://www.twitter.com/" target="_blank">Twitter</a>
      <dd>
      <dd>
        <a href="https://www.instagram.com/" target="_blank">Instagram</a>
      <dd>
          <#--
          <dd>
              <a href="mailto:xianxin@layui-inc.com?subject=%E7%94%B3%E8%AF%B7Fly%E7%A4%BE%E5%8C%BA%E5%8F%8B%E9%93%BE" class="fly-link">申请友链</a>
          <dd>
          -->
    </dl>
  </div>

</div>
```
