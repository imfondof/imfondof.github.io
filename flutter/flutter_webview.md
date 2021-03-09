# flutter webView 使用以及与 js 互操作

> [lzyprime 博客 (github)](https://lzyprime.github.io)    
> 创建时间：2020.03.06         
> qq及邮箱：2383518170     


## λ: 

- 仓库地址：[https://github.com/lzyprime/flutter_demos/tree/flutter_webview_demo](https://github.com/lzyprime/flutter_demos/tree/flutter_webview_demo)

- ```bash
  git clone -b flutter_webview_demo https://github.com/lzyprime/flutter_demos.git
  ```

- 插件： [webview_flutter](https://pub.dev/packages/webview_flutter)  ， 目前版本：^0.3.19+9

- 由于要兼顾 Android 和 Ios 两个平台的webView,  js 调用native时无法直接返回数据，所以通过回调的形式曲线救国： 接到js请求后，处理数据，然后主动调用js相关函数。

- flutter 调用js 可以监听返回值

## 主要参数和方法

> ### 官方的example或者跳到源码一看便知

```dart
// 构造函数  
const WebView({
    Key key,
    this.onWebViewCreated, //webView创建完成后的回调函数， WebViewCreatedCallback(WebViewController controller)，会返回 webViewController
    this.initialUrl, //要加载的url地址
    this.javascriptMode = JavascriptMode.disabled, //js是否执行，默认值为不执行, JavascriptMode.unrestricted执行。不能为空
    this.javascriptChannels, // js 调用 flutter 时的处理者们，set<JavascriptChannel>。 所有JavascriptChannel的name不允许重复
    this.navigationDelegate, // 拦截请求并处理，详情请查看源码
    this.gestureRecognizers, // 手势监听与处理，详情请查看源码
    this.onPageStarted,  // 开始加载时的回调，PageStartedCallback(String url)
    this.onPageFinished, // 加载结束的回调，PageFinishedCallback(String url)
  
  /// 剩余参数英文直译即可，详情请查看源码
    this.debuggingEnabled = false,
    this.gestureNavigationEnabled = false,
    this.userAgent,
    this.initialMediaPlaybackPolicy =
        AutoMediaPlaybackPolicy.require_user_action_for_all_media_types,
  })  : assert(javascriptMode != null),
        assert(initialMediaPlaybackPolicy != null),
        super(key: key);
```



#### webViewController: 

`onWebViewCreated` 会返回 当前webView的controller, 官方给的example里的做法是定义一个`Completer<WebViewController>`  实现延迟初始化：

```dart
class _WebViewPageState extends State<WebViewPage> {
  final _controller = Completer<WebViewController>();
  ....
  WebView(
        ....
        onWebViewCreated: (controller) {
            _controller.complete(controller);
        },
  )
  ....
}
```

之后对`WebViewController` 的调用通过 `_controller.future` 来实现，类型是`Future<WebViewController>`, 所以全都是异步调用:

```dart
_controller.future.then((controller){
  ...
})
  // 或
 FutureBuilder(
  future: _controller.future,
  builder: (BuildContext context,AsyncSnapshot<WebViewController> controller){
    return (Widget)
  }
)
```

主要函数：

```dart
// loadUrl，currentUrl，canGoBack ... 等函数
// 查看源码，看函数名和注释便知功能

///其中，js互操作常用：
Future<String> evaluateJavascript("js 代码") // 执行js, 并且可以接收 js 执行的返回值
```



#### JavascriptChannel

```dart
  JavascriptChannel({
    @required this.name, // js 调用时的变量名，
    // 如name="Print", js可以通过 Print.postMessage(msg) 调用flutter
    // 请求会在 onMessageReceived 函数中处理
    
    @required this.onMessageReceived, // 处理js 请求
    // typedef void JavascriptMessageHandler(JavascriptMessage message);
    // message.message 即 js 调用时传递的msg
    // 函数没有返回值
    
  })  : assert(name != null),
        assert(onMessageReceived != null),
        assert(_validChannelNames.hasMatch(name));
```



## 封装互操作

> Flutter 调用 js 是可以接收返回值的， js 写好函数，flutter 调就是了。      
> js 调用 flutter 无返回值， 所以要做一点简单封装  

#### js 请求包与相应包格式：

```json
// js 请求:
{
  guid: String, // 用于校验请求一致性，flutter 原封不动传回
  api: String, // 要请求的接口名, flutter 原封不动传回
  data: Object, 
  ...
  ...
}
  
// flutter 回包：
{
  guid: String, // 用于校验请求一致性，由js传入， flutter 原封不动传回
  api: String, // 要请求的接口名, 由js传入， flutter 原封不动传回
  data: Object, 
  ...
  ...
} 
```



#### flutter

```dart
// JavascriptChannel 以接口的形式实现，目的是将一组api封装在一起
// 当然也可以直接构造

class NativeBridge implements JavascriptChannel {
  BuildContext context; //来源于当前widget, 便于操作UI
  Future<WebViewController> _controller; //当前webView 的 controller

  NativeBridge(this.context, this._controller);

  
  // api 与具体函数的映射表，可通过 _functions[key](data) 调用函数
  // 如 _functions["getValue"](null)
  get _functions => <String, Function>{
        "getValue": _getValue,
        "inputText": _inputText,
        "showSnackBar": _showSnackBar,
        "newWebView": _newWebView,
      }; 

  @override
  String get name => "nativeBridge"; // js 通过 nativeBridge.postMessage(msg); 调用flutter

  // 处理js请求
  @override
  get onMessageReceived => (msg) async {
    		
    		// 将收到的string数据转为json
        Map<String, dynamic> message = json.decode(msg.message);
    
  			// 异步是因为有些api函数实现可能为异步，如inputText，等待UI相应
    		// 根据 api 字段，调用具体函数
        final data = await _functions[message["api"]](message["data"]);
    
    		// 组织回包
    		final res = <String, dynamic>{
          "guid": message["guid"],
          "api": message["api"],
          "data": data
        }
    
    		// 执行js函数，window.jsBridge.receiveMessage
    		// 将数据转为字符串传递
        _controller.then((v) => v.evaluateJavascript(
            "window.jsBridge.receiveMessage(${json.encode(res)})"));
      };
  
  
  Map<String, dynamic> _getValue(data) => {"value": 1};

  Future<Map<String, dynamic>> _inputText(data) async {
    String text = await showDialog(
        context: context,
        builder: (_) {
          final textController = TextEditingController();
          return AlertDialog(
            content: TextField(controller: textController),
            actions: <Widget>[
              FlatButton(
                  onPressed: () => Navigator.pop(context, textController.text),
                  child: Icon(Icons.done)),
            ],
          );
        });
    return {"text": text ?? ""};
  }

  Map<String, dynamic> _showSnackBar(data) {
    Scaffold.of(context)
        .showSnackBar(SnackBar(content: Text(data["text"] ?? "")));
    return null;
  }

  Map<String, dynamic> _newWebView(data) {
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => WebViewPage(url: data["url"])));
    return null;
  }
}
```

加入webView中：

```dart

class _WebViewPageState extends State<WebViewPage> {
  final _controller = Completer<WebViewController>();
	...
  @override
  Widget build(BuildContext context) {
    ...
    			WebView(
						...
          javascriptChannels: [NativeBridge(context, _controller.future)].toSet(),
          )
  }
}
```



#### js

> 我不会写js,  也省略了guid生成的部分。大概原理如下：   
>
> 如果 Js 调用 flutter 需要返回值，则准备一个处理数据的回调函数，flutter 处理完数据后，主动调用回调函数。
>
> 为了方便flutter 调用，封装了 window.jsBridge.receiveMessage(msg), 该函数根据 guid和api字段分发到具体的回调函数。 

```html
<!DOCTYPE html>
<html>

<body>
    <p id="getValue"></p>
    <hr />
    <p id="inputText"></p>

    <script>
        var callbacks = {};
        window.jsBridge = {
          	// js 调用 flutter, 将回调函数保存到callbacks里
            invoke: function (api, data, callback) {
                callbacks[api] = callback;
                nativeBridge.postMessage(JSON.stringify({
                    api: api,
                    data: data || {},
                }));
            },
          
          	// flutter 处理完数据后调用, 根据guid和api，在callbacks里取出回调继续执行
            receiveMessage: function (msg) {
                if (callbacks[msg.api]) {
                    callbacks[msg.api](msg); // 执行调用
                }
            }
        };

        window.jsBridge.invoke("getValue", {}, function (data) {
            document.getElementById("getValue").innerHTML = JSON.stringify(data);
        });

        window.jsBridge.invoke("inputText", {}, function (data) {
            document.getElementById("inputText").innerHTML = JSON.stringify(data);
        });

        window.jsBridge.invoke("showSnackBar", { text: "snackBar should show" }, null);

        window.jsBridge.invoke("newWebView", { url: "https://lzyprime.github.io" }, null);


    </script>

</body>

</html>
```



## ～λ：

- 再次强调，我不会js，而且这只是简单的demo,  主要为了说明原理， 实际应用时肯定会更严格。但是方式还是类似：***js 调用 flutter 并保存回调， flutter 处理完成后主动调用回调， 从而实现返回值***    

- 完整代码在仓库里，为了方便只有一个文件