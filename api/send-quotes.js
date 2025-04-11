const admin = require('firebase-admin');
const serviceAccount = require('../lovequotes-d3e8f-firebase-adminsdk-fbsvc-3ca7c7cf23.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  try {
    const now = new Date().toISOString();
    const quotesRef = db.collection('quotes');
    const snapshot = await quotesRef.where('scheduledTime', '<=', now).get();

    if (snapshot.empty) {
      return res.status(200).send('No scheduled quotes right now.');
    }

    const usersSnapshot = await db.collection('users').get();
    const tokens = usersSnapshot.docs.map(doc => doc.id);

    for (const docSnap of snapshot.docs) {
      const quote = docSnap.data();
      const payload = {
        notification: {
          title: quote.title,
          body: quote.message,
        },
        data: {
          audioUrl: quote.audioUrl || ''
        }
      };

      const response = await admin.messaging().sendToDevice(tokens, payload);
      console.log('Notification sent:', response);

      await docSnap.ref.delete();
    }

    res.status(200).send('Notifications sent.');
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).send('Error occurred.');
  }
};