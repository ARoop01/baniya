package com.example.expensetracker.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsMessage
import android.util.Log
import com.example.expensetracker.data.LocalDatabaseHelper
import com.example.expensetracker.data.Expense
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "android.provider.Telephony.SMS_RECEIVED") {
            val bundle = intent.extras
            if (bundle != null) {
                try {
                    val pdus = bundle.get("pdus") as Array<*>
                    for (pdu in pdus) {
                        val msg = SmsMessage.createFromPdu(pdu as ByteArray)
                        val sender = msg.originatingAddress
                        val body = msg.messageBody
                        Log.d("SmsReceiver", "Received SMS from $sender: $body")
                        parseAndSaveTransaction(context, body, sender ?: "Unknown Sender")
                    }
                } catch (e: Exception) {
                    Log.e("SmsReceiver", "Error parsing SMS", e)
                }
            }
        }
    }

    private fun parseAndSaveTransaction(context: Context, body: String, sender: String) {
        val lowerBody = body.lowercase(Locale.getDefault())

        // 1. Filter: Check for debit transaction keywords, ignore credit/deposit alerts
        val isDebit = lowerBody.contains("debited") || 
                      lowerBody.contains("spent") || 
                      lowerBody.contains("transacted") || 
                      lowerBody.contains("paid") || 
                      lowerBody.contains("sent") || 
                      lowerBody.contains("withdrawal") || 
                      lowerBody.contains("debit")
        
        val isCredit = lowerBody.contains("credited") || 
                       lowerBody.contains("received") || 
                       lowerBody.contains("deposited")

        if (!isDebit || isCredit) return

        // 2. Extract Amount using Regex
        val amountRegex = """(?i)(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)""".toRegex()
        val matchResult = amountRegex.find(body)
        val amountStr = matchResult?.groupValues?.get(1)?.replace(",", "")
        val amount = amountStr?.toDoubleOrNull() ?: return

        // 3. Extract Merchant or Recipient
        val merchantRegex = """(?i)(?:at|to|info:)\s+([A-Za-z0-9\s#&'-]+)(?:\s+on|\s+ref|\s+via|\s+date|\.|\n|$)""".toRegex()
        val merchantMatch = merchantRegex.find(body)
        var merchant = merchantMatch?.groupValues?.get(1)?.trim() ?: sender

        if (merchant.length > 50) {
            merchant = merchant.substring(0, 47) + "..."
        }

        // 4. Save to Database
        val dbHelper = LocalDatabaseHelper(context)
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val isoSdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        
        val todayStr = sdf.format(Date())
        val isoNowStr = isoSdf.format(Date())

        val expense = Expense(
            id = UUID.randomUUID().toString(),
            amount = amount,
            categoryId = "def-other", // Fallback to other category
            date = todayStr,
            paymentMethod = if (lowerBody.contains("upi")) "UPI" else "Other",
            notes = "Auto-logged from SMS: $merchant",
            updatedAt = isoNowStr,
            isDeleted = 0
        )

        dbHelper.saveExpense(expense)
        Log.d("SmsReceiver", "Auto-saved transaction: ₹$amount at $merchant")
        
        // Show status bar notification to user
        showNotification(context, amount, merchant)
    }

    private fun showNotification(context: Context, amount: Double, merchant: String) {
        try {
            val channelId = "hisaab_sms_alerts"
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                val channel = android.app.NotificationChannel(
                    channelId,
                    "SMS Auto-log Alerts",
                    android.app.NotificationManager.IMPORTANCE_DEFAULT
                )
                notificationManager.createNotificationChannel(channel)
            }

            val builder = androidx.core.app.NotificationCompat.Builder(context, channelId)
                .setSmallIcon(android.R.drawable.ic_menu_save)
                .setContentTitle("Hisaab Auto-Log")
                .setContentText("Auto-logged expense: ₹$amount at $merchant")
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)

            notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
        } catch (e: Exception) {
            Log.e("SmsReceiver", "Notification trigger error", e)
        }
    }
}
