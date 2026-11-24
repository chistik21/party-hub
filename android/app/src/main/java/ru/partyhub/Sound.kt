package ru.partyhub

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.media.MediaPlayer
import androidx.compose.runtime.staticCompositionLocalOf

val LocalTap=staticCompositionLocalOf<()->Unit>{{}}
class HubSound(private val ctx:Context){
 private val effects=SoundPool.Builder().setMaxStreams(4).setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).build()).build()
 private val ids=listOf("tap","join","start","count","right","timeout","win","unlock","wheel","notice").mapNotNull{k->
  runCatching{k to ctx.assets.openFd("site/sound/$k.wav").use{effects.load(it,1)}}.getOrNull()
 }.toMap()
 private val music=runCatching{MediaPlayer().apply{ctx.assets.openFd("site/sound/music.wav").use{setDataSource(it.fileDescriptor,it.startOffset,it.length)};prepare();isLooping=true}}.getOrNull()
 fun play(name:String,volume:Float){ids[name]?.let{if(volume>0)effects.play(it,volume,volume,1,0,1f)}}
 fun background(enabled:Boolean,volume:Float){music?.apply{setVolume(volume*.32f,volume*.32f);if(enabled&&!isPlaying)start() else if(!enabled&&isPlaying)pause()}}
 fun release(){effects.release();music?.release()}
}
