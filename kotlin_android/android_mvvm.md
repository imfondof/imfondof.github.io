# android mvvm架构

> [lzyprime 博客 (github)](https://lzyprime.github.io)   
> 创建时间：2020.10.23  
> qq及邮箱：2383518170  

## [kotlin & android 笔记](https://lzyprime.github.io/kotlin_android/kotlin_android)

---

## λ：

> - [官网_应用架构指南-MVVM](https://developer.android.google.cn/jetpack/guide)

```bash
# android mvvm demo
# 仓库地址: https://github.com/lzyprime/android_demos
# branch: mvvm

git clone -b mvvm https://github.com/lzyprime/android_demos
```

## 添加组件

### 网络：Retrofit + kotlin 协程

我也试过其他框架：[Fuel](https://github.com/kittinunf/fuel), [Ktor Client](https://ktor.kotlincn.net/clients/index.html)。但是迫于业务需求，最后保留了Retrofit。如果网络请求比较简单，可以试试这两个框架，由`kotlin`实现，和协程配合更好。

> - [Retrofit 官网](https://square.github.io/retrofit/)
> - [kotlin 协程](https://www.kotlincn.net/docs/reference/coroutines/coroutines-guide.html)


### lifecycle ktx：ViewModel, LiveData

> - [生命周期处理](https://developer.android.google.cn/topic/libraries/architecture/lifecycle?hl=zh_cn)
> - [Lifecycle](https://developer.android.google.cn/jetpack/androidx/releases/lifecycle?hl=zh_cn#declaring_dependencies)
> - [ViewModel](https://developer.android.google.cn/topic/libraries/architecture/viewmodel?hl=zh_cn)
> - [LiveData](https://developer.android.google.cn/topic/libraries/architecture/livedata)

- androidx.lifecycle:lifecycle-runtime-ktx
- androidx.lifecycle:lifecycle-livedata-ktx
- androidx.lifecycle:lifecycle-viewmodel-ktx
- androidx.activity:activity-ktx

其中`activity-ktx`目的：
```kotlin
    class MyActivity : AppCompatActivity() {

        override fun onCreate(savedInstanceState: Bundle?) {
            // Create a ViewModel the first time the system calls an activity's onCreate() method.
            // Re-created activities receive the same MyViewModel instance created by the first activity.

            // Use the 'by viewModels()' Kotlin property delegate
            // from the activity-ktx artifact
            val model: MyViewModel by viewModels()
            model.getUsers().observe(this, Observer<List<User>>{ users ->
                // update UI
            })
        }
    }
```


### 依赖注入：Hlit
> - [Hilt](https://developer.android.google.cn/training/dependency-injection)
> - [依赖注入原理](https://developer.android.google.cn/training/dependency-injection/manual)
> - [Hilt 和 Jetpack集成](https://developer.android.google.cn/training/dependency-injection/hilt-jetpack)


### 数据库：Room

> - [Room](https://developer.android.google.cn/topic/libraries/architecture/room) (暂时没需求)

## MVVM
### 0. init

#### NetUtil

```kotlin
// 网络请求工具

// utils/Net.kt
object Net {
    private const val PROP_BASE_URL = "https://api.unsplash.com/"
    private const val DEBUG_BASE_URL = "https://api.unsplash.com/"
    private val BASE_URL get() = DEBUG_BASE_URL
    private const val ACCESS_KEY = "<access_key unsplash.com>" // 注册https://api.unsplash.com/后拿到

    val retrofit: Retrofit by lazy {
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val url = chain.request().url().newBuilder().addQueryParameter("client_id", ACCESS_KEY).build()
                val request = chain.request().newBuilder().url(url).build()
                chain.proceed(request)
            }.build()

        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
}
```

#### Response

```kotlin
// 处理网络回包

// data/bean/Response.kt
sealed class Response<out T> {
    data class Success<T>(val data: T) : Response<T>()
    object Failed : Response<Nothing>()
}

```

#### Application

```kotlin
// 依赖注入

// UnsplashApplication.kt
@HiltAndroidApp
class UnsplashApplication : Application() {
  ...
}
```

```xml
<!-- AndroidManifest.xml -->

...

    <application
        android:name=".UnsplashApplication"
        ...
        >
```

### 1. Model

#### data bean

```kotlin
// json 解析，变量名与json字段一致

// data/bean/Photo.kt
data class Photo(
    val id: String,
    val created_at: String = "",
    val updated_at: String = "",
    val urls: Urls,
    val likes: Long = 0,
    val liked_by_user: Boolean = false,
    val user: User,
) {
    data class Urls(
        val raw: String,
        val full: String,
        val regular: String,
        val small: String,
        val thumb: String,
    )
}

// data/bean/User.kt
data class User(
    val id:String,
    val updated_at:String = "",
    val username:String="",
    val name:String = "",
    val first_name:String = "",
    val last_name:String = "",
)
```

#### retrofit interface

```kotlin
// retrofit 请求interface

// data/api/UnsplashService.kt
interface UnsplashService {
    @GET("photos")
    suspend fun listPhotos(): List<Photo>
}
```

#### service module

```kotlin
// hilt 依赖注入，interface无法直接构造，需要通过Module和Provides指明构造方式

// data/api/ServiceModule.kt
@Module
@InstallIn(ApplicationComponent::class)
object ServiceModule {
    private inline fun <reified T> createService(): T = Net.retrofit.create(T::class.java)

    @Singleton
    @Provides
    fun unsplashService():UnsplashService = createService()
}
```

#### Model: UnsplashRepository

```kotlin
// model层，提供数据

// data/UnsplashRepository.kt
@Singleton
class UnsplashRepository @Inject constructor(private val service: UnsplashService) {
    suspend fun listPhoto() = try {
        Response.Success(service.listPhotos())
    } catch (_ : Exception){
        Response.Failed
    }
}
```

### 2. ViewModel

```kotlin
//viewmodels/ListPhotoViewModel.kt

class ListPhotoViewModel @ViewModelInject constructor(private val repository: UnsplashRepository) :
    ViewModel() {
    val listPhotos:MutableLiveData<List<Photo>> = MutableLiveData()

    fun refreshListPhotos() = viewModelScope.launch {
        when(val res = repository.listPhoto()){
            is Response.Success -> listPhotos.value = res.data
            is Response.Failed -> listPhotos.value = emptyList()
        }
    }
}
```

### 3. View

```kotlin
// RecycleView, RefreshBottun, 暴力写法
// MainActivity.kt

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    private val model: ListPhotoViewModel by viewModels()

    init {
        lifecycleScope.launchWhenCreated {
            model.refreshListPhotos()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        refreshBtn.setOnClickListener {
            model.refreshListPhotos()
        }

        photoList.layoutManager = GridLayoutManager(this, 2)
        model.listPhotos.observe(this) { photos ->
            photoList.adapter = object : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
                override fun onCreateViewHolder(
                    parent: ViewGroup,
                    viewType: Int
                ): RecyclerView.ViewHolder = object : RecyclerView.ViewHolder(
                    ImageView(parent.context)
                ) {}

                override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
                    val photo = photos[position]

                    with(holder.itemView as ImageView) {
                        Glide.with(this).load(photo.urls.raw).into(this)
                    }
                }

                override fun getItemCount(): Int = photos.size
            }
        }
    }
}
```