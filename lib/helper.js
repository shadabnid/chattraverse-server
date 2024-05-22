import { userSocketIds } from "../app.js"

const getOtherMember = (members, userId) =>
    members.find((member) => member._id.toString() !== userId.toString())

const getSockets = (
    users=[])=>users.map((user)=>userSocketIds.get(user.toString()));

const getBase64 = (file)=>(`data:${file._idmimetype};base64,${file.buffer.toString("base64")}`)

export { getOtherMember ,getSockets,getBase64}