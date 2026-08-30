const { db, admin } = require('../config/firebase');

class NotificationSchedule {
  constructor(data) {
    this.title = data.title || '';
    this.message = data.message || '';
    this.type = data.type || 'one-time'; // one-time | recurring
    this.schedule = data.schedule || null; // cron-like or ISO
    this.recipients = data.recipients || 'All Users';
    this.status = data.status || 'scheduled'; // scheduled | paused | cancelled
  }

  static get collection() {
    return db.collection('notifications');
  }

  static async create(payload) {
    try {
      const dataToSave = {
        ...payload,
        status: payload.status || 'scheduled',
        recipients: payload.recipients || 'All Users',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      const docRef = await this.collection.add(dataToSave);
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error creating notification schedule:', error);
      throw error;
    }
  }

  static async find(filter = {}, options = {}) {
    try {
      let q = this.collection.orderBy('createdAt', 'desc');
      if (filter.status) q = q.where('status', '==', filter.status);
      if (options.limit) q = q.limit(parseInt(options.limit));
      const snapshot = await q.get();
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error finding notifications:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error finding notification by id:', error);
      throw error;
    }
  }

  static async findByIdAndUpdate(id, update) {
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return null;
      const updateData = { ...update, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
      await docRef.update(updateData);
      const updated = await docRef.get();
      return { id: updated.id, ...updated.data() };
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  }

  static async findByIdAndDelete(id) {
    try {
      const doc = await this.findById(id);
      if (!doc) return null;
      await this.collection.doc(id).delete();
      return doc;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationSchedule;
