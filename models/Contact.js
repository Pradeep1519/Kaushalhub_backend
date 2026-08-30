const { db, admin } = require('../config/firebase');

class Contact {
  constructor(data) {
    this.name = data.name || '';
    this.email = data.email ? data.email.toLowerCase() : '';
    this.phone = data.phone || '';
    this.subject = data.subject || '';
    this.message = data.message || '';
    this.inquiryType = data.inquiryType || 'general';
    this.course = data.course || '';
    this.currentCompany = data.currentCompany || '';
    this.experience = data.experience || '';
    this.currentSalary = data.currentSalary || '';
    this.expectedSalary = data.expectedSalary || '';
    this.technicalIssue = data.technicalIssue || '';
    this.placementSupport = data.placementSupport || '';
    this.status = data.status || 'new';
  }

  static get collection() {
    return db.collection('contacts');
  }

  // Create contact
  static async create(contactData) {
    try {
      const dataToSave = {
        ...contactData,
        email: contactData.email.toLowerCase(),
        status: 'new',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.collection.add(dataToSave);
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  // Find contact by ID
  static async findById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error finding contact:', error);
      throw error;
    }
  }

  // Find contacts
  static async find(filter = {}, options = {}) {
    try {
      let q = this.collection.orderBy('createdAt', 'desc');
      
      if (filter.status) {
        q = q.where('status', '==', filter.status);
      }

      // Pagination
      if (options.limit) {
        q = q.limit(parseInt(options.limit));
      }
      if (options.skip) {
        q = q.offset(parseInt(options.skip));
      }

      const snapshot = await q.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error finding contacts:', error);
      throw error;
    }
  }

  // Count contacts
  static async countDocuments(filter = {}) {
    try {
      let q = this.collection;
      
      if (filter.status) {
        q = q.where('status', '==', filter.status);
      }

      const snapshot = await q.get();
      return snapshot.size;
    } catch (error) {
      console.error('Error counting contacts:', error);
      throw error;
    }
  }

  // Update contact
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
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  // Save contact
  async save() {
    try {
      const dataToSave = { ...this };
      dataToSave.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      dataToSave.createdAt = dataToSave.createdAt || admin.firestore.FieldValue.serverTimestamp();

      if (this.id) {
        await Contact.collection.doc(this.id).update(dataToSave);
      } else {
        const docRef = await Contact.collection.add(dataToSave);
        this.id = docRef.id;
      }
      return this;
    } catch (error) {
      console.error('Error saving contact:', error);
      throw error;
    }
  }
}

module.exports = Contact;