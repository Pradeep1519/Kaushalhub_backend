const { db, admin } = require('../config/firebase');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.name = data.name || '';
    this.email = data.email ? data.email.toLowerCase() : '';
    this.password = data.password || '';
    this.role = data.role || 'student';
    this.enrolledCourses = data.enrolledCourses || [];
    this.profile = data.profile || {};
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.isEnrolled = data.enrolledCourses && data.enrolledCourses.length > 0;
    this.lastLogin = data.lastLogin || null;
    this.resetToken = data.resetToken || null;
    this.resetTokenExpiry = data.resetTokenExpiry || null;
  }

  static get collection() {
    return db.collection('users');
  }

  // Create new user with hashed password
  static async create(userData) {
    try {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const userDataToSave = {
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role || 'student',
        enrolledCourses: [],
        profile: {},
        isActive: true,
        isEnrolled: false,
        isDemo: !!userData.isDemo,
        lastLogin: null,
        resetToken: null,
        resetTokenExpiry: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.collection.add(userDataToSave);
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Find user by email
  static async findOne(query) {
    try {
      if (!query.email) return null;
      
      const snapshot = await this.collection
        .where('email', '==', query.email.toLowerCase())
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error finding user:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id, selectFields = null) {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return null;
      
      const data = doc.data();
      
      // If select fields specified
      if (selectFields) {
        const fields = selectFields.split(' ');
        const filteredData = { id: doc.id };
        fields.forEach(field => {
          if (field !== '-password' && data[field] !== undefined) {
            filteredData[field] = data[field];
          }
        });
        return filteredData;
      }
      
      return { id: doc.id, ...data };
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Update user
  static async findByIdAndUpdate(id, update, options = {}) {
    try {
      const userRef = this.collection.doc(id);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) return null;

      let updateData = {};

      // Handle $push operator
      if (update.$push && update.$push.enrolledCourses) {
        const currentData = userDoc.data();
        const newCourse = update.$push.enrolledCourses;
        const enrolledCourses = currentData.enrolledCourses || [];
        
        // Check duplicate
        const exists = enrolledCourses.some(c => c.courseId === newCourse.courseId);
        if (!exists) {
          enrolledCourses.push(newCourse);
          updateData.enrolledCourses = enrolledCourses;
          updateData.isEnrolled = enrolledCourses.length > 0;
        }
      }
      // Handle $pull operator
      else if (update.$pull && update.$pull.enrolledCourses) {
        const currentData = userDoc.data();
        const enrolledCourses = (currentData.enrolledCourses || []).filter(
          course => course.courseId !== update.$pull.enrolledCourses.courseId
        );
        updateData.enrolledCourses = enrolledCourses;
        updateData.isEnrolled = enrolledCourses.length > 0;
      }
      // Handle $set operator
      else if (update.$set) {
        updateData = { ...update.$set };
      }
      // Direct update
      else {
        updateData = { ...update };
      }

      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      await userRef.update(updateData);

      const updated = await userRef.get();
      return { id: updated.id, ...updated.data() };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Save user instance
  async save() {
    try {
      const userData = { ...this };
      userData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      
      if (this.id) {
        await User.collection.doc(this.id).update(userData);
      } else {
        const docRef = await User.collection.add(userData);
        this.id = docRef.id;
      }
      return this;
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  // Compare password
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Convert to JSON (remove password)
  toJSON() {
    const obj = { ...this };
    delete obj.password;
    delete obj.resetToken;
    return obj;
  }

  // Find users
  static async find(filter = {}) {
    try {
      let query = this.collection;
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error finding users:', error);
      throw error;
    }
  }
}

module.exports = User;