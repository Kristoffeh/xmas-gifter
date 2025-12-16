import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { gifts } = body;

    if (!Array.isArray(gifts)) {
      return NextResponse.json(
        { error: "Gifts array is required" },
        { status: 400 }
      );
    }

    // Verify all personIds belong to the user
    const personIds = gifts.map((g: any) => g.personId);
    const people = await prisma.person.findMany({
      where: {
        id: { in: personIds },
        userId: session.user.id,
      },
    });

    if (people.length !== personIds.length) {
      return NextResponse.json(
        { error: "Invalid person IDs" },
        { status: 400 }
      );
    }

    // Create new gifts (no need to delete existing ones - allow multiple)
    const createdGifts = await Promise.all(
      gifts.map((gift: { personId: string; description: string }) =>
        prisma.gift.create({
          data: {
            description: gift.description,
            personId: gift.personId,
          },
        })
      )
    );

    return NextResponse.json({ gifts: createdGifts }, { status: 201 });
  } catch (error) {
    console.error("Error creating gifts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { personId, description, giftId } = body;

    if (!personId || !description) {
      return NextResponse.json(
        { error: "Person ID and description are required" },
        { status: 400 }
      );
    }

    // Verify person belongs to user
    const person = await prisma.person.findFirst({
      where: {
        id: personId,
        userId: session.user.id,
      },
    });

    if (!person) {
      return NextResponse.json(
        { error: "Person not found" },
        { status: 404 }
      );
    }

    // If giftId is provided, update existing gift, otherwise create new
    let gift;
    if (giftId) {
      // Verify gift belongs to person
      const existingGift = await prisma.gift.findFirst({
        where: {
          id: giftId,
          personId: personId,
        },
      });

      if (!existingGift) {
        return NextResponse.json(
          { error: "Gift not found" },
          { status: 404 }
        );
      }

      gift = await prisma.gift.update({
        where: { id: giftId },
        data: { description },
      });
    } else {
      // Create new gift
      gift = await prisma.gift.create({
        data: {
          description,
          personId,
        },
      });
    }

    return NextResponse.json({ gift }, { status: 200 });
  } catch (error) {
    console.error("Error updating gift:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { giftId, purchased, giftWrapped } = body;

    if (!giftId) {
      return NextResponse.json(
        { error: "Gift ID is required" },
        { status: 400 }
      );
    }

    if (purchased === undefined && giftWrapped === undefined) {
      return NextResponse.json(
        { error: "At least one field (purchased or giftWrapped) must be provided" },
        { status: 400 }
      );
    }

    // Verify gift belongs to user's person
    const gift = await prisma.gift.findFirst({
      where: {
        id: giftId,
      },
      include: {
        person: true,
      },
    });

    if (!gift || gift.person.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Gift not found" },
        { status: 404 }
      );
    }

    // Update the gift with the provided fields
    const updateData: { purchased?: boolean; giftWrapped?: boolean } = {};
    if (purchased !== undefined) {
      updateData.purchased = purchased;
    }
    if (giftWrapped !== undefined) {
      updateData.giftWrapped = giftWrapped;
    }

    const updatedGift = await prisma.gift.update({
      where: { id: giftId },
      data: updateData,
    });

    return NextResponse.json({ gift: updatedGift }, { status: 200 });
  } catch (error) {
    console.error("Error updating gift status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const giftId = searchParams.get("giftId");
    const personId = searchParams.get("personId");

    if (!giftId) {
      return NextResponse.json(
        { error: "Gift ID is required" },
        { status: 400 }
      );
    }

    // Verify gift belongs to user's person
    const gift = await prisma.gift.findFirst({
      where: {
        id: giftId,
      },
      include: {
        person: true,
      },
    });

    if (!gift || gift.person.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Gift not found" },
        { status: 404 }
      );
    }

    await prisma.gift.delete({
      where: { id: giftId },
    });

    return NextResponse.json({ message: "Gift deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting gift:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

