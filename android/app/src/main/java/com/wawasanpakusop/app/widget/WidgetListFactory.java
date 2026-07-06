package com.wawasanpakusop.app.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.text.format.DateFormat;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import com.wawasanpakusop.app.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Supplies one RemoteViews row per upcoming order to the widget's ListView.
 * Reads from SharedPreferences rather than making its own network call,
 * since WidgetUpdateService (which does the actual fetch) already writes
 * the latest result there before triggering notifyAppWidgetViewDataChanged.
 */
public class WidgetListFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private final List<OrderRow> orders = new ArrayList<>();

    public WidgetListFactory(Context context) {
        this.context = context;
    }

    @Override
    public void onCreate() {}

    @Override
    public void onDataSetChanged() {
        orders.clear();
        SharedPreferences prefs = context.getSharedPreferences(WidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE);
        String cachedJson = prefs.getString(WidgetUpdateService.PREF_ORDERS_JSON, null);

        if (cachedJson == null) return;

        try {
            JSONArray arr = new JSONArray(cachedJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                orders.add(new OrderRow(
                    o.optInt("quantity", 0),
                    o.optString("meals", "N/A"),
                    o.optString("location", "N/A"),
                    o.optString("menu", "N/A"),
                    formatDate(o.optString("date", ""))
                ));
            }
        } catch (Exception e) {
            // Malformed cache — leave orders empty, widget will show "no data".
        }
    }

    @Override
    public void onDestroy() {
        orders.clear();
    }

    @Override
    public int getCount() {
        return orders.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_order_item);
        OrderRow item = orders.get(position);

        row.setTextViewText(R.id.item_date_pax, item.date + " — " + item.quantity + " Pax");
        row.setTextViewText(R.id.item_meal_location, item.meals + " | " + item.location);
        row.setTextViewText(R.id.item_menu, "Menu: " + item.menu);

        return row;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }

    private String formatDate(String isoDate) {
        try {
            SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
            Date date = isoFormat.parse(isoDate.replace("Z", ""));
            SimpleDateFormat displayFormat = new SimpleDateFormat("dd MMM, h:mm a", Locale.getDefault());
            return displayFormat.format(date);
        } catch (Exception e) {
            return isoDate;
        }
    }

    private static class OrderRow {
        final int quantity;
        final String meals;
        final String location;
        final String menu;
        final String date;

        OrderRow(int quantity, String meals, String location, String menu, String date) {
            this.quantity = quantity;
            this.meals = meals;
            this.location = location;
            this.menu = menu;
            this.date = date;
        }
    }
}
