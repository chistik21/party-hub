plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("org.jetbrains.kotlin.plugin.compose") }
android {
 namespace="ru.partyhub"; compileSdk=35
 defaultConfig { applicationId="ru.partyhub"; minSdk=26; targetSdk=35; versionCode=1; versionName="1.0" }
 buildFeatures { compose=true }
 compileOptions {sourceCompatibility=JavaVersion.VERSION_17;targetCompatibility=JavaVersion.VERSION_17}
 kotlinOptions {jvmTarget="17"}
}
dependencies {
 implementation(platform("androidx.compose:compose-bom:2024.12.01"))
 implementation("androidx.activity:activity-compose:1.10.0")
 implementation("androidx.compose.material3:material3")
 implementation("com.squareup.okhttp3:okhttp:4.12.0")
 implementation("org.nanohttpd:nanohttpd-websocket:2.3.1")
 implementation("org.mozilla:rhino:1.7.15")
 implementation("com.caverock:androidsvg-aar:1.4")
 implementation("com.journeyapps:zxing-android-embedded:4.3.0")
}
