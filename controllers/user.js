import bcrypt from 'bcrypt';
import User from '../models/users.js';
import Chat from '../models/chat.js';
import Request from '../models/request.js';
import { cookieOption, emitEvent, sendToken, uploadFilesToCloudinary } from '../utils/features.js';
import { TryCatch } from '../middleware/error.js';
import { ErrorHandler } from '../utils/utility.js';
import { NEW_REQUEST, REFETCH_CHATS } from '../constant/event.js';
import { getOtherMember } from '../lib/helper.js'

//create new user and save it

const newUser = TryCatch(async (req, res, next) => {
    const { name, username, password, bio } = req.body;
    const file = req.file;
    
    if (!file) {
        return next(new ErrorHandler("please upload avatar", 400));
    }

    const result = await uploadFilesToCloudinary([file]);

    

    const avatar = {
        public_id: result[0].public_id,
        url: result[0].url,
    }

    const user = await User.create({
        name,
        username,
        password,
        avatar,
        bio
    })
    sendToken(res, user, 201, "user created");
    res.status(201).json({ message: "user is create succesful" })
})

//login to user to profile
const login = TryCatch(async (req, res, next) => {

    const { username, password } = req.body;
    const user = await User.findOne({ username }).select("+password");

    if (!user) return next(new ErrorHandler("Invalid Username or Password", 404));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(new ErrorHandler("Invalid Username or Password", 404));

    sendToken(res, user, 201, `Welcome Back, ${user.name}`);


});

const getMyProfile = TryCatch(async (req, res) => {
    const user = await User.findById(req.user);
    res.status(200).json({
        success: true,
        user,
    });
});

const logOut = TryCatch(async (req, res, next) => {
    return res.status(200).cookie('chattarverse-token', "",
        { ...cookieOption, maxAge: 0 }).json({
            success: true,
            message: "Logged Out succesfully",
        });
});

const searchUser = TryCatch(async (req, res, next) => {
    const { name } = req.query;
    //find all my chats
    
    const myChats = await Chat.find({ groupchat: false, members: req.user });
    console.log(myChats);
    //find all friend and me
    const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);
    allUsersFromMyChats.push(req.user);
    //remove all friends
    const allUsersExceptMeandFriends = await User.find({
        _id: { $nin: allUsersFromMyChats },
        name: { $regex: name, $options: "i" },
    })

    const users = allUsersExceptMeandFriends.map(({_id, name, avatar}) => ({
        _id,
        name,
        avatar: avatar.url,
    }))
    res.status(200).json({
        success: true,
        users,
    });
});

const sendFriendRequest = TryCatch(async (req, res, next) => {
    const { userId } = req.body;

    const request = await Request.findOne({
        $or: [
            { sender: req.user, receiver: userId },
            { sender: userId, receiver: req.user }
        ]
    });

    if (request){
        return res.status(400).json({
            success:false,
            message:"friend request already sent"});
    }

    await Request.create({
        sender: req.user,
        receiver: userId,
    })

    emitEvent(req, NEW_REQUEST, [userId]);

    return res.status(200).json({
        success: true,
        message: "Friend Request sent"
    })
});

const acceptFriendRequest = TryCatch(async (req, res, next) => {
    const { requestId, accept } = req.body;
    const request = await Request.findById(requestId)
        .populate("sender", "name")
        .populate("receiver", "name");

    if (!request)
        return next(new ErrorHandler("Request is not found", 404));

    if (request.receiver._id.toString() !== req.user.toString())
        return next(new ErrorHandler("you are not athorized to accept this request", 401));

    if (!accept) {
        await request.deleteOne();
        return res.status(200).json({
            success: true,
            message: "Request is rejected"
        })

    }

    const members = [request.sender._id, request.receiver._id];

    await Promise.all([
        Chat.create({
            members,
            name: `${request.sender.name}-${request.receiver.name}`,
        }),
        request.deleteOne(),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
        success: true,
        message: "Request is accepted",
        senderId: request.sender._id
    });
});

const geMyNotification = TryCatch(async (req, res, next) => {
    const requests = await Request.find({ receiver: req.user })
        .populate("sender", "name avatar")

    const allRequests = requests.map(({ _id, sender }) => ({
        _id,
        sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url,
        }
    }))

    return res.status(200).json({
        success: true,
        allRequests,
    })
});

const getMyFriends = TryCatch(async (req, res, next) => {
    const chatId = req.query.chatId;
    
    const chats = await Chat.find({
        members: req.user,
        groupchat: false,
    }).populate("members", "name avatar");

    const friends = chats.map(({ members }) => {
        const otherUser = getOtherMember(members, req.user);
        return {
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar.url,
        }
    }
    )

    if (chatId) {
        const chat = await Chat.findById(chatId);

        const availableFriends = friends.filter((friend) =>
            !chat.members.includes(friend._id)
        )
        return res.status(200).json({
            success: true,
            friends: availableFriends,
        })
    }
    else {
        return res.status(200).json({
            success: true,
            friends,
        })

    }
});

export {
    newUser,
    login,
    getMyProfile,
    logOut,
    searchUser,
    sendFriendRequest,
    acceptFriendRequest,
    geMyNotification,
    getMyFriends,
};