const { db, admin } = require('../config/firebase');

class Course {
  constructor(data) {
    this.slug = data.slug || data.id || '';
    this.id = data.id || data.slug || '';
    this.title = data.title || '';
    this.description = data.description || '';
    this.shortDescription = data.shortDescription || data.description || '';
    this.price = data.price || 0;
    this.originalPrice = data.originalPrice || data.price || 0;
    this.discountedPrice = data.discountedPrice || data.price || 0;
    this.discountPercent = data.discountPercent || 0;
    this.savings = data.savings || 0;
    this.image = data.image || '';
    this.duration = data.duration || '';
    this.level = data.level || 'Beginner';
    this.category = data.category || '';
    this.trainerId = data.trainerId || '';
    this.status = data.status || 'active';
    this.featured = data.featured !== undefined ? data.featured : true;
    this.rating = data.rating || 0;
    this.students = data.students || '0+';
    this.reviews = data.reviews || '0';
    this.outcomes = data.outcomes || [];
    this.curriculum = data.curriculum || [];
    this.meta = data.meta || {};
  }

  static get collection() {
    return db.collection('courses');
  }

  static async upsertBySlug(slug, courseData) {
    try {
      const docId = slug || courseData.slug || courseData.id;
      const normalized = {
        ...courseData,
        slug: docId,
        id: docId,
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
      console.error('Error upserting course:', error);
      throw error;
    }
  }

  static async create(courseData) {
    try {
      const dataToSave = {
        ...courseData,
        slug: courseData.slug || courseData.id || '',
        id: courseData.id || courseData.slug || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.collection.add(dataToSave);
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }

  static async find(filter = {}) {
    try {
      let q = this.collection;

      if (filter.trainerId) {
        q = q.where('trainerId', '==', filter.trainerId);
      }
      if (filter.status) {
        q = q.where('status', '==', filter.status);
      }
      if (filter.slug) {
        q = q.where('slug', '==', filter.slug);
      }

      const snapshot = await q.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error finding courses:', error);
      throw error;
    }
  }

  static async findPublic() {
    try {
      const snapshot = await this.collection.where('status', '==', 'active').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error finding public courses:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error finding course:', error);
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
      console.error('Error finding course by slug:', error);
      throw error;
    }
  }

  static async findByIdAndUpdate(id, update, options = {}) {
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
      console.error('Error updating course:', error);
      throw error;
    }
  }

  async save() {
    try {
      const dataToSave = { ...this };
      dataToSave.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      dataToSave.createdAt = dataToSave.createdAt || admin.firestore.FieldValue.serverTimestamp();

      if (this.id) {
        await Course.collection.doc(this.id).update(dataToSave);
      } else {
        const docRef = await Course.collection.add(dataToSave);
        this.id = docRef.id;
      }
      return this;
    } catch (error) {
      console.error('Error saving course:', error);
      throw error;
    }
  }
}

module.exports = Course;