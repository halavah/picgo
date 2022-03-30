# Part02-集成Shiro实现博客详情-添加文章、编辑文章、提交文章

```text
blog
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          ├─controller
│      │          │      BaseController.java
│      │          │      PostController.java
│      │
│      └─resources
│          ├─templates
│          │  └─post
│          │         edit.ftl
```

## 2.1 博客详情：添加文章/编辑文章、提交文章

- `PostController.java` ：控制层，【添加】、【编辑】、【提交】

```java
@Controller
public class PostController extends BaseController {
    /**
     * 添加/编辑edit：【添加/编辑】文章
     */
    @GetMapping("/post/edit")
    public String edit() {
        //getParameter：http://localhost:8080/post/edit?id=1
        String id = req.getParameter("id");
        //如果id不为空
        if (!StringUtils.isEmpty(id)) {
            Post post = postService.getById(id);
            Assert.isTrue(post != null, "该文章已被删除！");
            Assert.isTrue(post.getUserId().longValue() == getProfileId().longValue(), "没权限操作此文章！");
            //向request域存放【post文章信息】
            req.setAttribute("post", post);
        }

        //向request域存放【categories分类信息】
        req.setAttribute("categories", categoryService.list());
        return "/post/edit";
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

        // 无论id是否存在，两类情况都会 retern 跳转到 /post/${id}
        return Result.success().action("/post/" + post.getId());
    }
}
```

- `edit.ftl` ：模板引擎，【添加】、【编辑】、【提交】

```injectedfreemarker
<#--宏layout.ftl（导航栏 + 页脚）-->
<#include "/inc/layout.ftl" />

<#--【三、填充（导航栏 + 页脚）】-->
<@layout "添加或编辑文章">

  <div class="layui-container fly-marginTop">
    <div class="fly-panel" pad20 style="padding-top: 5px;">
      <!--<div class="fly-none">没有权限</div>-->
      <div class="layui-form layui-form-pane">
        <div class="layui-tab layui-tab-brief" lay-filter="user">

          <#--1.类型：发表文章/编辑文章-->
          <ul class="layui-tab-title">
            <li class="layui-this">
              <#--通过post是否为null，来判断该页面是【发表文章 还是 编辑文章】-->
              <#if post == null>
                发表文章<#else>编辑文章
              </#if>
            </li>
          </ul>

          <div class="layui-form layui-tab-content" id="LAY_ucm" style="padding: 20px 0;">
            <div class="layui-tab-item layui-show">
              <#--2.表单-->
              <form action="/post/submit" method="post">
                <div class="layui-row layui-col-space15 layui-form-item">
                  <#--2.1 所在专栏-->
                  <div class="layui-col-md3">
                    <label class="layui-form-label">所在专栏</label>
                    <div class="layui-input-block">
                      <select lay-verify="required" name="categoryId" lay-filter="column">
                        <option></option>
                        <#--下拉列表：分类信息-->
                        <#list categories as category>
                          <option value="${category.id}" <#if category.id == post.categoryId>selected</#if> >${category.name}</option>
                        </#list>
                      </select>
                    </div>
                  </div>

                  <#--2.2 文章标题-->
                  <div class="layui-col-md9">
                    <label for="L_title" class="layui-form-label">标题</label>
                    <div class="layui-input-block">
                      <input type="text" id="L_title" name="title" required lay-verify="required" value="${post.title}"
                             autocomplete="off" class="layui-input">
                      <input type="hidden" name="id" value="${post.id}">
                    </div>
                  </div>
                </div>

                <#--2.3 文章内容-->
                <div class="layui-form-item layui-form-text">
                  <div class="layui-input-block">
                    <textarea id="L_content" name="content" required lay-verify="required"
                              placeholder="详细描述" class="layui-textarea fly-editor" style="height: 260px;">${post.content}</textarea>
                  </div>
                </div>

                <#--2.4 提交表单-->
                <div class="layui-form-item">
                  <button class="layui-btn" lay-filter="*" lay-submit alert="true" >立即发布</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    layui.cache.page = 'jie';
  </script>

</@layout>
```

## 2.2 博客详情：添加文章/编辑文章-使用表情

- `edit.ftl` ：模板引擎，默认表情无法被识别，需要引入 fly、face

```injectedfreemarker
<#--宏layout.ftl（导航栏 + 页脚）-->
<#include "/inc/layout.ftl" />

<#--【三、填充（导航栏 + 页脚）】-->
<@layout "博客详情">

  <#--【二、分类】-->
  <#include "/inc/header-panel.ftl" />
  <script>
      layui.cache.page = 'jie';

      //如果你是采用模版自带的编辑器，你需要开启以下语句来解析
      $(function () {
          layui.use(['fly', 'face'], function() { //引入fly、face
              var fly = layui.fly;
              $('.detail-body').each(function(){
                  var othis = $(this), html = othis.html();
                  othis.html(fly.content(html));
              });
          });
      });
  </script>
</@layout>
```
