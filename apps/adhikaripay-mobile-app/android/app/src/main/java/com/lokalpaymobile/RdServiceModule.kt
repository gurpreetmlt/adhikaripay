package com.lokalpaymobile

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.os.Build
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray

/**
 * UIDAI L1 fingerprint capture via Android Intent API.
 * Discovers installed RD Service apps by CAPTURE intent — package names vary by vendor/version.
 */
class RdServiceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var capturePromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "RdService"

  /** Packages that register in.gov.uidai.rdservice.fp.CAPTURE */
  private fun discoverRdPackages(): List<String> {
    val intent = Intent(ACTION_CAPTURE)
    val pm = reactContext.packageManager
    val flags =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          PackageManager.MATCH_ALL
        } else {
          0
        }
    @Suppress("DEPRECATION")
    val resolved: List<ResolveInfo> = pm.queryIntentActivities(intent, flags)
    return resolved
        .mapNotNull { it.activityInfo?.packageName }
        .distinct()
  }

  private fun resolveRdPackage(preferred: String?): String? {
    val found = discoverRdPackages()
    if (found.isEmpty()) return null

    val pref = preferred?.trim().orEmpty()
    if (pref.isNotEmpty() && found.contains(pref)) return pref

    // Prefer Mantra if user selected Mantra but package id differs from our hardcoded list
    if (pref.contains("mantra", ignoreCase = true) || pref.isEmpty()) {
      found.firstOrNull { it.contains("mantra", ignoreCase = true) }?.let { return it }
    }

    if (pref.isNotEmpty()) {
      // Preferred package not installed — still use any available RD (chooser-like)
      return found.first()
    }
    return found.first()
  }

  @ReactMethod
  fun listRdPackages(promise: Promise) {
    try {
      val arr: WritableArray = Arguments.createArray()
      for (pkg in discoverRdPackages()) {
        arr.pushString(pkg)
      }
      promise.resolve(arr)
    } catch (e: Exception) {
      promise.reject("RD_LIST_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun isPackageAvailable(rdPackage: String, promise: Promise) {
    try {
      val found = discoverRdPackages()
      if (found.isEmpty()) {
        promise.resolve(false)
        return
      }
      val pref = rdPackage.trim()
      if (pref.isEmpty()) {
        promise.resolve(true)
        return
      }
      if (found.contains(pref)) {
        promise.resolve(true)
        return
      }
      // Mantra UI label vs actual Play Store package often differs — treat any Mantra RD as OK
      if (pref.contains("mantra", ignoreCase = true) &&
          found.any { it.contains("mantra", ignoreCase = true) }) {
        promise.resolve(true)
        return
      }
      // Any RD installed counts as available for capture (we auto-pick)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("RD_CHECK_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun captureFingerprint(rdPackage: String, pidOptions: String, promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "App activity not available")
      return
    }
    if (capturePromise != null) {
      promise.reject("CAPTURE_BUSY", "Fingerprint capture already in progress")
      return
    }

    val target = resolveRdPackage(rdPackage)
    if (target == null) {
      promise.reject(
          "RD_NOT_FOUND",
          "No UIDAI fingerprint RD Service found. Install Mantra L1 RDService and open it once.",
      )
      return
    }

    try {
      val intent = Intent(ACTION_CAPTURE)
      intent.setPackage(target)
      intent.putExtra(EXTRA_PID_OPTIONS, pidOptions)
      capturePromise = promise
      activity.startActivityForResult(intent, REQUEST_CAPTURE)
    } catch (e: Exception) {
      capturePromise = null
      promise.reject("CAPTURE_START_FAILED", "Failed to start $target: ${e.message}", e)
    }
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    if (requestCode != REQUEST_CAPTURE) return

    val promise = capturePromise ?: return
    capturePromise = null

    if (resultCode != Activity.RESULT_OK || data == null) {
      promise.reject("CAPTURE_CANCELLED", "Fingerprint capture was cancelled")
      return
    }

    val pidData = data.getStringExtra(EXTRA_PID_DATA)
    if (!pidData.isNullOrBlank()) {
      promise.resolve(pidData)
      return
    }

    val dnc = data.getStringExtra("DNC")
    val dnr = data.getStringExtra("DNR")
    when {
      !dnc.isNullOrBlank() -> promise.reject("DEVICE_NOT_CONNECTED", "Scanner not connected ($dnc)")
      !dnr.isNullOrBlank() -> promise.reject("DEVICE_NOT_READY", "Scanner not ready ($dnr)")
      else -> promise.reject("CAPTURE_FAILED", "RD Service returned no fingerprint data")
    }
  }

  override fun onNewIntent(intent: Intent) {
    // no-op
  }

  companion object {
    private const val ACTION_CAPTURE = "in.gov.uidai.rdservice.fp.CAPTURE"
    private const val EXTRA_PID_OPTIONS = "PID_OPTIONS"
    private const val EXTRA_PID_DATA = "PID_DATA"
    private const val REQUEST_CAPTURE = 9911
  }
}
