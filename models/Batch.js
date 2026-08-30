const { db, admin } = require('../config/firebase');

// Firestore-backed Batch model.
// A Batch groups a set of enrolled students under one course + one teacher,
// with a schedule. Admin creates batches and assigns teacher + students.
class Batch {
  constructor(data) {
    this.name = data.name || '';                      // e.g. "Tally Prime - Morning - Aug 2026"
    this.courseId = data.courseId || '';
    this.courseTitle = data.courseTitle || '';
    this.teacherId = data.teacherId || null;           // User.id (role: trainer)
    this.teacherName = data.teacherName || '';
    this.studentIds = data.studentIds || [];            // [User.id, ...]
    this.timing = data.timing || '';                    // e.g. "Mon-Fri, 10AM-12PM"
    this.startDate = data.startDate || null;
    this.endDate = data.endDate || null;
    this.status = data.status || 'upcoming';            // upcoming | active | completed
    this.mode = data.mode || 'offline';                  // offline | online | hybrid
  }

  static get collection() {
    return db.collection('batches');
  }

  static async create(data) {
    const toSave = {
      name: data.name || '',
      courseId: data.courseId || '',
      courseTitle: data.courseTitle || '',
      teacherId: data.teacherId || null,
      teacherName: data.teacherName || '',
      studentIds: data.studentIds || [],
      timing: data.timing || '',
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      status: data.status || 'upcoming',
      mode: data.mode || 'offline',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await this.collection.add(toSave);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  }

  static async findById(id) {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  static async find(filter = {}) {
    let q = this.collection;
    if (filter.teacherId) q = q.where('teacherId', '==', filter.teacherId);
    if (filter.courseId) q = q.where('courseId', '==', filter.courseId);
    if (filter.status) q = q.where('status', '==', filter.status);
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async findByIdAndUpdate(id, update) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    let updateData = {};

    if (update.$addToSet && update.$addToSet.studentIds) {
      const current = doc.data().studentIds || [];
      const toAdd = update.$addToSet.studentIds;
      const merged = Array.from(new Set([...current, ...toAdd]));
      updateData.studentIds = merged;
    } else if (update.$pull && update.$pull.studentIds) {
      const current = doc.data().studentIds || [];
      updateData.studentIds = current.filter(id => id !== update.$pull.studentIds);
    } else {
      updateData = { ...update };
    }

    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await docRef.update(updateData);
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  }

  static async findByIdAndDelete(id) {
    const doc = await this.findById(id);
    if (!doc) return null;
    await this.collection.doc(id).delete();
    return doc;
  }
}

module.exports = Batch;
