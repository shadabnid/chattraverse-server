import { User } from '../models/users.js';
import { faker } from '@faker-js/faker';
const createUser = async (numbers) => {
    try {
        const userPromise = [];
        for (let i = 0; i < numbers; i++) {
            const tempUser = User.create({
                name:faker.person.fullName(),
                username:faker.internet.userName(),
                bio:faker.lorem.sentence(10),
                password:"password",
                avatar:{
                    url:faker.image.avatar(),
                    public_id:faker.system.fileName(),
                }
            });
            userPromise.push(tempUser);
        }
        await Promise.all(userPromise);
        console.log("user craeted",numbers);
        process.exit(1);
    } catch (error) {

        console.log(error);
        process.exit(1);
    }
}

export {createUser};