package ru.partyhub

import android.app.*
import android.content.Context as AndroidContext
import android.content.Intent
import android.net.nsd.*
import android.os.IBinder
import android.util.AtomicFile
import fi.iki.elonen.NanoHTTPD
import fi.iki.elonen.NanoWSD
import org.json.JSONObject
import org.json.JSONArray
import org.mozilla.javascript.*
import java.io.File
import java.io.IOException
import java.net.NetworkInterface
import java.net.Inet4Address
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

fun addresses():List<String> = runCatching {
 NetworkInterface.getNetworkInterfaces().toList().filter { it.isUp && !it.isLoopback }
 .sortedBy { if(it.name.startsWith("wlan")||it.name.startsWith("ap"))0 else 1 }
 .flatMap { it.inetAddresses.toList() }.filterIsInstance<Inet4Address>().map { "http://"+it.hostAddress+":3000" }
}.getOrDefault(emptyList())

class LocalHost(val app:AndroidContext):NanoWSD("0.0.0.0",3000) {
 private val clients=ConcurrentHashMap<String,WebSocket>()
 private lateinit var scope:ScriptableObject
 private val timer=Executors.newSingleThreadScheduledExecutor()
 private val folder=File(app.filesDir,"profiles").apply{mkdirs()}
 private fun profile(key:String):AtomicFile { require(key.matches(Regex("[0-9a-f]{48}")));return AtomicFile(File(folder,"$key.json")) }
 @Synchronized private fun <T> js(block:(Context)->T):T {
  val cx=Context.enter()
  try { cx.optimizationLevel=-1;cx.languageVersion=Context.VERSION_ES6;return block(cx) } finally { Context.exit() }
 }
 private fun bridge(name:String,fn:(Array<out Any?>)->Any?){
  ScriptableObject.putProperty(scope,name,object:BaseFunction(){
   override fun call(cx:Context?,sc:Scriptable?,self:Scriptable?,args:Array<out Any?>):Any?=fn(args)
  })
 }
 fun launch(){
  js { cx->
   scope=cx.initStandardObjects()
   bridge("sendTo"){a->runCatching{clients[a[0].toString()]?.send(a[1].toString())};""}
   bridge("restore"){a->val f=profile(a[0].toString());try{String(f.readFully(),Charsets.UTF_8)}catch(e:java.io.FileNotFoundException){""}}
   bridge("persist"){a->val f=profile(a[0].toString());val stream=f.startWrite();try{stream.write(a[1].toString().toByteArray());f.finishWrite(stream)}catch(e:Exception){f.failWrite(stream);throw e};""}
   for(n in listOf("bank","engine","wire"))app.assets.open("core/$n.js").bufferedReader().use{cx.evaluateReader(scope,it,n,1,null)}
  }
  start(0,false)
  timer.scheduleWithFixedDelay({runCatching{call("tick")}.onFailure{HostService.log("Ошибка таймера: "+it.message)}},100,100,TimeUnit.MILLISECONDS)
 }
 private fun call(method:String,vararg args:String):Any?=js{cx->
  val wire=scope.get("Wire",scope) as Scriptable
  (wire.get(method,wire) as org.mozilla.javascript.Function).call(cx,scope,wire,args)
 }
 fun info():String=js{cx->Context.toString(cx.evaluateString(scope,"JSON.stringify(Wire.info())","info",1,null))}
 fun shutdown(){timer.shutdownNow();stop()}
 override fun openWebSocket(handshake:IHTTPSession):WebSocket{
  val id=UUID.randomUUID().toString()
  return object:WebSocket(handshake){
   override fun onOpen(){clients[id]=this;HostService.log("Подключение")}
   override fun onClose(code:WebSocketFrame.CloseCode?,reason:String?,initiatedByRemote:Boolean){clients.remove(id);call("close",id)}
   override fun onMessage(message:WebSocketFrame){val raw=message.textPayload;if(raw.length<=180000)call("message",id,raw) else close(WebSocketFrame.CloseCode.MessageTooBig,"Размер сообщения",false)}
   override fun onPong(pong:WebSocketFrame?){}
   override fun onException(exception:IOException?){HostService.log("Обрыв соединения")}
  }
 }
 override fun serveHttp(session:IHTTPSession):NanoHTTPD.Response{
  if(session.uri=="/info")return newFixedLengthResponse(Response.Status.OK,"application/json",JSONObject(info()).put("urls",JSONArray(addresses())).put("v",1).toString())
  val p=if(session.uri=="/")"index.html" else session.uri.removePrefix("/")
  if(p.contains(".."))return newFixedLengthResponse(Response.Status.NOT_FOUND,"text/plain","Нет файла")
  return try{val input=app.assets.open("site/$p");val mime=when(p.substringAfterLast('.')){"js"->"application/javascript";"wav"->"audio/wav";"css"->"text/css";"svg"->"image/svg+xml";"html"->"text/html;charset=utf-8";"webmanifest"->"application/manifest+json";else->"application/octet-stream"};newChunkedResponse(Response.Status.OK,mime,input)}catch(e:IOException){newFixedLengthResponse(Response.Status.NOT_FOUND,"text/plain","Нет файла")}
 }
}
class HostService:Service(){
 companion object{
  @Volatile var host:LocalHost?=null
  @Volatile var started=0L
  val events=mutableListOf<String>()
  @Synchronized fun log(msg:String){events.add(msg);if(events.size>30)events.removeAt(0)}
  @Synchronized fun journal()=events.toList().asReversed().joinToString("\n")
 }
 private var registered=false
 private val listener=object:NsdManager.RegistrationListener{
  override fun onServiceRegistered(s:NsdServiceInfo){registered=true}
  override fun onServiceUnregistered(s:NsdServiceInfo){registered=false}
  override fun onRegistrationFailed(s:NsdServiceInfo,c:Int){log("Доступен ручной ввод IP")}
  override fun onUnregistrationFailed(s:NsdServiceInfo,c:Int){}
 }
 override fun onStartCommand(i:Intent?,flags:Int,id:Int):Int{
  val nm=getSystemService(NotificationManager::class.java)!!
  nm.createNotificationChannel(NotificationChannel("server","Вечеринка по Wi-Fi",NotificationManager.IMPORTANCE_LOW))
  val pi=PendingIntent.getActivity(this,0,Intent(this,Main::class.java),PendingIntent.FLAG_IMMUTABLE)
  startForeground(3000,Notification.Builder(this,"server").setContentTitle("PARTY HUB").setContentText("Локальный игровой сервер работает").setSmallIcon(ru.partyhub.R.drawable.hub).setContentIntent(pi).setOngoing(true).build())
  if(host==null)try{val h=LocalHost(this);h.launch();host=h;started=System.currentTimeMillis();log("Сервер запущен")
   val service=NsdServiceInfo().apply{serviceName="PARTY HUB";serviceType="_partyhub._tcp.";port=3000}
   runCatching{getSystemService(NsdManager::class.java)!!.registerService(service,NsdManager.PROTOCOL_DNS_SD,listener)}
  }catch(e:Exception){log("Запуск: "+e.message);stopSelf()}
  return START_NOT_STICKY
 }
 override fun onDestroy(){if(registered)runCatching{getSystemService(NsdManager::class.java)!!.unregisterService(listener)};host?.shutdown();host=null;log("Сервер остановлен");super.onDestroy()}
 override fun onBind(i:Intent?):IBinder?=null
}
