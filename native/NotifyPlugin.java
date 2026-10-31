package com.wayanime.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "Notify")
public class NotifyPlugin extends Plugin {

    private static final String TAG = "WA-Notify";
    private static final String WORK_NAME = "wa_episode_check";

    @PluginMethod
    public void scheduleEpisodeCheck(PluginCall call) {
        try {
            Context ctx = getContext();
            Constraints constraints = new Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build();
            PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(
                    EpisodeWorker.class, 15, TimeUnit.MINUTES)
                    .setConstraints(constraints)
                    .build();
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
                    WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, req);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "schedule failed", e);
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void cancelEpisodeCheck(PluginCall call) {
        try {
            WorkManager.getInstance(getContext()).cancelUniqueWork(WORK_NAME);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void setWatching(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("wa_notify", Context.MODE_PRIVATE);
            prefs.edit()
                    .putString("animeId", call.getString("animeId", ""))
                    .putString("title", call.getString("title", ""))
                    .putString("lastEp", call.getString("lastEp", ""))
                    .apply();
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void clearWatching(PluginCall call) {
        try {
            getContext().getSharedPreferences("wa_notify", Context.MODE_PRIVATE).edit().clear().apply();
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void requestPerm(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", true);
        call.resolve(r);
    }

    @PluginMethod
    public void sync(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void show(PluginCall call) {
        call.resolve();
    }
}
