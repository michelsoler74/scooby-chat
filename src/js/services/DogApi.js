/**
 * Servicio para obtener imágenes de perros aleatorias
 * Implementación simple para la aplicación Scooby
 */
class DogApi {
  constructor() {
    this.baseUrl = "https://dog.ceo/api";
    console.log("DogApi inicializado");
  }

  /**
   * Obtiene una imagen aleatoria de perro
   * @returns {Promise<string>} - URL de la imagen
   */
  async getRandomDog() {
    try {
      const response = await fetch(`${this.baseUrl}/breeds/image/random`);
      if (!response.ok) {
        throw new Error(`Error al obtener imagen: ${response.statusText}`);
      }
      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error("Error en DogApi:", error);
      return "https://dog.ceo/img/dog-api-logo.svg"; // Imagen por defecto
    }
  }

  /**
   * Obtiene una lista de razas de perros
   * @returns {Promise<string[]>} - Lista de razas
   */
  async getBreeds() {
    try {
      const response = await fetch(`${this.baseUrl}/breeds/list/all`);
      if (!response.ok) {
        throw new Error(`Error al obtener razas: ${response.statusText}`);
      }
      const data = await response.json();
      return Object.keys(data.message);
    } catch (error) {
      console.error("Error al obtener razas:", error);
      return [];
    }
  }

  /**
   * Obtiene una imagen aleatoria de una raza específica
   * @param {string} breed - Nombre de la raza
   * @returns {Promise<string>} - URL de la imagen
   */
  async getBreedImage(breed) {
    if (!breed) return this.getRandomDog();

    try {
      const response = await fetch(
        `${this.baseUrl}/breed/${breed}/images/random`
      );
      if (!response.ok) {
        throw new Error(
          `Error al obtener imagen de raza: ${response.statusText}`
        );
      }
      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error(`Error al obtener imagen de ${breed}:`, error);
      return this.getRandomDog();
    }
  }
}

export default DogApi;
