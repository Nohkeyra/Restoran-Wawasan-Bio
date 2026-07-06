package com.wawasanpakusop.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import com.wawasanpakusop.app.R;

/**
 * Home-screen widget that shows the nearest upcoming catering orders.
 * Data is fetched from the Render backend's /api/widget/upcoming-orders
 * endpoint by WidgetUpdateService, which then pushes the result back here
 * via updateAppWidget().
 */
public class WawasanWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_REFRESH = "com.wawasanpakusop.app.widget.ACTION_REFRESH";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            // Show a lightweight "loading" state immediately, then kick off
            // the network fetch which will update the view when it completes.
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_upcoming_orders);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
        WidgetUpdateService.fetchAndUpdate(context, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(
                new android.content.ComponentName(context, WawasanWidgetProvider.class)
            );
            WidgetUpdateService.fetchAndUpdate(context, ids);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // First widget instance placed on the home screen.
    }

    @Override
    public void onDisabled(Context context) {
        // Last widget instance removed from the home screen.
    }
}
