package com.wayanime.app;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.os.Build;
import android.provider.Settings;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WayNative")
public class WayNativePlugin extends Plugin {

    @PluginMethod
    public void fullscreen(PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        final Activity a = getActivity();
        a.runOnUiThread(() -> {
            try {
                WindowCompat.setDecorFitsSystemWindows(a.getWindow(), !on);
                WindowInsetsControllerCompat c = WindowCompat.getInsetsController(a.getWindow(), a.getWindow().getDecorView());
                if (on) {
                    c.hide(WindowInsetsCompat.Type.systemBars());
                    c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                    a.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                } else {
                    c.show(WindowInsetsCompat.Type.systemBars());
                    a.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                }
            } catch (Exception ignored) {}
            call.resolve();
        });
    }

    @PluginMethod
    public void deviceName(PluginCall call) {
        String n = null;
        try { n = Settings.Global.getString(getContext().getContentResolver(), "device_name"); } catch (Exception ignored) {}
        if (n == null || n.trim().isEmpty()) n = Build.MODEL;
        JSObject o = new JSObject();
        o.put("name", n);
        call.resolve(o);
    }
}
