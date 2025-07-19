import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Perfis de usuário disponíveis
export const USER_ROLES = {
  ADMIN: 'administrador',
  PRODUCER: 'produtor',
  CONSULTANT: 'consultor',
  MANAGER: 'gerente',
  OPERATOR: 'operador',
  COMMERCIAL: 'comercial'
};

// Áreas de atuação
export const AREAS = {
  LOGISTICS: 'logistica',
  WAREHOUSE: 'almoxarifado',
  VISUAL_COMMUNICATION: 'comunicacao_visual',
  RENTAL: 'locacao',
  PURCHASES: 'compras',
  PRODUCTION: 'producao',
  COMMERCIAL: 'comercial',
  OPERATIONS: 'operacional',
  FINANCIAL: 'financeiro',
  PROJECTS: 'projetos',
  LOGOTIPIA: 'logotipia'
};

export const userService = {
  // Criar usuário
  async createUser(userData) {
    try {
      const docRef = await addDoc(collection(db, 'usuarios'), {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  },

  // Buscar usuário por ID
  async getUserById(userId) {
    try {
      const docRef = doc(db, 'usuarios', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw error;
    }
  },

  // Listar todos os usuários
  async getAllUsers() {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'usuarios'), orderBy('nome'))
      );
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  },

  // Buscar usuários por área
  async getUsersByArea(area) {
    try {
      const q = query(
        collection(db, 'usuarios'), 
        where('area', '==', area),
        orderBy('nome')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar usuários por área:', error);
      throw error;
    }
  },

  // Buscar usuários por função
  async getUsersByRole(role) {
    try {
      const q = query(
        collection(db, 'usuarios'), 
        where('funcao', '==', role),
        orderBy('nome')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar usuários por função:', error);
      throw error;
    }
  },

  // Atualizar usuário
  async updateUser(userId, userData) {
    try {
      const docRef = doc(db, 'usuarios', userId);
      await updateDoc(docRef, {
        ...userData,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  },

  // Deletar usuário
  async deleteUser(userId) {
    try {
      await deleteDoc(doc(db, 'usuarios', userId));
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  }
};

