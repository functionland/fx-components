package land.fx.blox

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Box"

  /**
   * Returns the instance of the [ReactActivityDelegate]. Here we use a util class [DefaultReactActivityDelegate] 
   * which allows you to easily enable Fabric and Concurrent React (aka React 18) with two boolean flags.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          DefaultReactActivityDelegate(
              this,
              mainComponentName,
              // If you opted-in for the New Architecture, we enable the Fabric Renderer.
              DefaultNewArchitectureEntryPoint.fabricEnabled
          )
      )

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val intent = intent
    val action = intent.action
    val data = intent.data
    // Handle the data (URL) here if necessary
  }
}
