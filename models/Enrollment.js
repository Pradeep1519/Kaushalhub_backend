const { db, admin } = require('../config/firebase');

class Enrollment {
  constructor(data) {
    this.fullName = data.fullName || '';
    this.email = data.email ? data.email.toLowerCase() : '';
    this.phone = data.phone || '';
    this.gender = data.gender || '';
    this.address = data.address || '';
    this.city = data.city || '';
    this.state = data.state || '';
    this.pincode = data.pincode || '';
    this.courseId = data.courseId || '';
    this.courseTitle = data.courseTitle || '';
    this.coursePrice = data.coursePrice || '';
    this.originalPrice = data.originalPrice || 0;
    this.discountPercentage = data.discountPercentage || 0;
    this.discountAmount = data.discountAmount || 0;
    this.finalPrice = data.finalPrice || 0;
    this.status = data.status || 'pending_payment';
    this.enrollmentDate = data.enrollmentDate || new Date().toISOString();
    this.paymentDate = data.paymentDate || null;
    this.additionalNotes = data.additionalNotes || '';
  }

  static get collection() {
    return db.collection('enrollments');
  }

  // Create enrollment
  static async create(enrollmentData) {
    try {
      const dataToSave = {
        ...enrollmentData,
        email: enrollmentData.email.toLowerCase(),
        enrollmentDate: new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.collection.add(dataToSave);
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error creating enrollment:', error);
      throw error;
    }
  }

  // Find one enrollment
  static async findOne(query) {
    try {
      let q = this.collection;
      
      // Build query
      if (query.email) q = q.where('email', '==', query.email.toLowerCase());
      if (query.courseId) q = q.where('courseId', '==', query.courseId);
      if (query.phone) q = q.where('phone', '==', query.phone);

      const snapshot = await q.limit(1).get();
      
      if (snapshot.empty) return null;

      let doc = snapshot.docs[0];
      let data = doc.data();

      // Filter by status array
      if (query.status && query.status.$in) {
        if (!query.status.$in.includes(data.status)) return null;
      }

      return { id: doc.id, ...data };
    } catch (error) {
      console.error('Error finding enrollment:', error);
      throw error;
    }
  }

  // Find enrollment by ID
  static async findById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error finding enrollment by ID:', error);
      throw error;
    }
  }

  // Find and update enrollment
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
      console.error('Error updating enrollment:', error);
      throw error;
    }
  }

  // Find and delete enrollment
  static async findByIdAndDelete(id) {
    try {
      const doc = await this.findById(id);
      if (!doc) return null;
      await this.collection.doc(id).delete();
      return doc;
    } catch (error) {
      console.error('Error deleting enrollment:', error);
      throw error;
    }
  }

  // Find enrollments with filters
  static async find(filter = {}) {
    try {
      let q = this.collection.orderBy('enrollmentDate', 'desc');
      
      if (filter.email) q = q.where('email', '==', filter.email.toLowerCase());
      if (filter.courseId) q = q.where('courseId', '==', filter.courseId);
      if (filter.status) q = q.where('status', '==', filter.status);

      const snapshot = await q.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error finding enrollments:', error);
      throw error;
    }
  }

  // Count documents
  static async countDocuments(filter = {}) {
    try {
      let q = this.collection;
      
      if (filter.status) q = q.where('status', '==', filter.status);
      if (filter.courseId) q = q.where('courseId', '==', filter.courseId);

      const snapshot = await q.get();
      return snapshot.size;
    } catch (error) {
      console.error('Error counting enrollments:', error);
      throw error;
    }
  }

  // Save enrollment
  async save() {
    try {
      const dataToSave = { ...this };
      dataToSave.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      dataToSave.createdAt = dataToSave.createdAt || admin.firestore.FieldValue.serverTimestamp();

      if (this.id) {
        await Enrollment.collection.doc(this.id).update(dataToSave);
      } else {
        const docRef = await Enrollment.collection.add(dataToSave);
        this.id = docRef.id;
      }
      return this;
    } catch (error) {
      console.error('Error saving enrollment:', error);
      throw error;
    }
  }
}

module.exports = Enrollment;