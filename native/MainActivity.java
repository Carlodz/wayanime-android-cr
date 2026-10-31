package com.wayanime.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ImmersivePlugin.class);
        registerPlugin(NotifyPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
