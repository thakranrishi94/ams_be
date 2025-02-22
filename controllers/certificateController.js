const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {createCanvas,loadImage}=require('canvas');
const {put}=require('@vercel/blob')


//Genertate Certificate
const generateCertificate=async(req,res)=>{
    try{
        console.log(req.body)
        const {eventId}=req.body
        const userId=req.body.userId;
        console.log(userId)
        
        const [event,user,template]=await Promise.all([
            prisma.eventRequest.findUnique({
                where:{eventRequestId:eventId},
                include:{alumni:true,faculty:true,admin:true}
            }),
            prisma.user.findUnique({where:{id:userId}}),
            prisma.certificateTemplate.findFirst({where:{active:true}})
        ]);
        const exisitingCert=await prisma.certificate.findFirst({
            where:{eventId,userId}
        });
        if(exisitingCert){
            return res.status(400).json({error:"Certificate already issued"});
        }
        const canvas=createCanvas(1200,800);
        const ctx=canvas.getContext('2d');
        const img=await loadImage(template.templateUrl);
        ctx.drawImage(img,0,0,1200,800);
        ctx.font='40px Arial';
        ctx.fillStyle='#000000';
        ctx.fillText(user.name,500,400);
        ctx.fillText(event.eventTitle,500,450);
        ctx.fillText(new Date().toLocaleDateString(),500,500);

        //save image
        const buffer=canvas.toBuffer('image/png');
        const blob=await put(`certificates/${eventId}_${userId}.png`,buffer,{
            access:'public',
        });

        //create Certificate Record
        const certificate=await prisma.certificate.create({
            data:{
                eventId,
                userId,
                certificateUrl:blob.url,
                templateId:template.id,
                issuerId:event.adminId || event.faculty?.userId||event.alumni?.userId
            }
        });
        res.json(certificate);
    }catch(error){
        console.error('Certificate generation error: ',error);
        res.status(500).json({
            error:'Failed to generate certificate'
        });
    }
};

module.exports={generateCertificate};