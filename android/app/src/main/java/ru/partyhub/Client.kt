package ru.partyhub
import android.os.Handler
import android.os.Looper
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class Client(val key:String,val receive:(JSONObject)->Unit,val status:(Boolean)->Unit){
 val main=Handler(Looper.getMainLooper())
 private val http=OkHttpClient.Builder().pingInterval(15,TimeUnit.SECONDS).build()
 private var ws:WebSocket?=null
 private var generation=0
 fun open(url:String){
  close();status(false);val g=generation
  fun dial(){
   if(g!=generation)return
   val req=runCatching{Request.Builder().url(url.trimEnd('/').replaceFirst("http","ws")+"/hub").build()}.getOrElse{receive(JSONObject().put("error","Проверь адрес сервера"));return}
   ws=http.newWebSocket(req,object:WebSocketListener(){
    override fun onOpen(s:WebSocket,r:Response){main.post{if(g==generation){status(true);send("hello","key" to key)}}}
    override fun onMessage(s:WebSocket,t:String){main.post{if(g==generation){val d=JSONObject(t);if(d.has("ping"))send("pong","value" to d.getLong("ping")) else receive(d)}}}
    private fun retry(){main.post{if(g==generation){status(false);main.postDelayed({dial()},1200)}}}
    override fun onFailure(s:WebSocket,t:Throwable,r:Response?){retry()}
    override fun onClosing(s:WebSocket,code:Int,reason:String){s.close(code,reason)}
    override fun onClosed(s:WebSocket,code:Int,reason:String){retry()}
   })
  }
  dial()
 }
 fun send(op:String,vararg args:Pair<String,Any?>){val o=JSONObject().put("v",1).put("op",op);args.forEach{o.put(it.first,it.second?:JSONObject.NULL)};ws?.send(o.toString())}
 fun close(){generation++;main.removeCallbacksAndMessages(null);ws?.cancel();ws=null}
 fun dispose(){close();http.dispatcher.executorService.shutdown();http.connectionPool.evictAll()}
}
