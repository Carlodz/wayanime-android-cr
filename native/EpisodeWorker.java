package com.wayanime.app;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class EpisodeWorker extends Worker {
    private static final String TAG = "WA-EpisodeWorker";

    public EpisodeWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "episode check tick");
        return Result.success();
    }

    public static void schedule(Context c) { /* optional */ }
    public static void cancel(Context c) { /* optional */ }
}
