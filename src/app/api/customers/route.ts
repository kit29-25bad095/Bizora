import { NextRequest, NextResponse } from "next/server";
import { CustomerService } from "@/lib/services/customer.service";
import { storeRepo } from "@/lib/data/repository";
import { toSafeErrorResponse, getHttpStatus, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const businessId = "11111111-1111-4111-8111-111111111111";
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase();
    const status = searchParams.get("status");

    let customers = await storeRepo.getCustomers(businessId);

    if (search) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.phone?.includes(search)
      );
    }

    if (status && status !== "all") {
      customers = customers.filter((c) => c.status === status);
    }

    return NextResponse.json({
      success: true,
      data: customers.map((c) => ({
        ...c,
        totalSpendMinorUnits: c.totalSpendMinorUnits.toString(),
        averageOrderValueMinorUnits: c.averageOrderValueMinorUnits.toString(),
      })),
      total: customers.length,
    });
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const businessId = body.businessId || "11111111-1111-4111-8111-111111111111";

    if (!body.name) {
      throw new ValidationError("Customer name is required");
    }

    const customer = await CustomerService.createCustomer(businessId, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      externalCustomerId: body.externalCustomerId,
      tags: body.tags,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...customer,
          totalSpendMinorUnits: customer.totalSpendMinorUnits.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}
