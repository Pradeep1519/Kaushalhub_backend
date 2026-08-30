const { db, admin } = require('../config/firebase');

class Trainer {
  static get collection() {
    return db.collection('trainers');
  }

  static async upsertById(id, trainerData) {
    try {
      const docId = id || trainerData.id || trainerData.slug || '';
      const normalized = {
        ...trainerData,
        id: docId,
        slug: trainerData.slug || docId,
        isActive: trainerData.isActive !== undefined ? trainerData.isActive : true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = this.collection.doc(docId);
      const existing = await docRef.get();
      if (!existing.exists) {
        normalized.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await docRef.set(normalized, { merge: true });
      const saved = await docRef.get();
      return { id: saved.id, ...saved.data() };
    } catch (error) {
      console.error('Error upserting trainer:', error);
      throw error;
    }
  }

  static async find(filter = {}) {
    try {
      let q = this.collection;
      if (filter.isActive !== undefined) {
        q = q.where('isActive', '==', filter.isActive);
      }
      const snapshot = await q.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error finding trainers:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error finding trainer by ID:', error);
      throw error;
    }
  }

  static async findBySlug(slug) {
    try {
      const snapshot = await this.collection.where('slug', '==', slug).limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error finding trainer by slug:', error);
      throw error;
    }
  }

  static async findByIdAndUpdate(id, update) {
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return null;

      const updateData = {
        ...update,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await docRef.update(updateData);
      const updated = await docRef.get();
      return { id: updated.id, ...updated.data() };
    } catch (error) {
      console.error('Error updating trainer:', error);
      throw error;
    }
  }
}

module.exports = Trainer;
